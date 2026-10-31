"""The bot's words (02_TECHNICAL.md §12.7): rendering, the checks before
going live, the admin's changes and switches, and the code's words when
Telegram refuses the admin's."""

import time

import pytest
from sqlalchemy import delete

from app.core.config import get_settings
from app.db.session import tenant_session, unscoped_session
from app.models import PlatformSetting, Store
from app.services import bot_texts, telegram
from app.services.bot_texts import DEFAULT, MESSAGES, TAG, TAG_LABELS, WORDS, Texts, render, word
from tests.helpers import add_product, place_order, registered_seller


@pytest.fixture(autouse=True)
async def code_words():
    """Every test leaves the code's words in place."""
    yield
    async with unscoped_session() as db:
        await db.execute(delete(PlatformSetting).where(PlatformSetting.key == bot_texts.KEY))
        await db.commit()


async def use(texts: Texts) -> None:
    async with unscoped_session() as db:
        await bot_texts.save(db, None, texts)
        await db.commit()


@pytest.fixture
def bot(monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(settings, "telegram_bot_token", "123:abc")
    monkeypatch.setattr(settings, "telegram_bot_username", "TestShopBot")
    monkeypatch.setattr(settings, "telegram_webhook_secret", "secret")
    monkeypatch.setattr(settings, "public_app_url", "https://app.example.com")
    sent: list[dict] = []

    async def fake_send(chat_id, text, button=None):
        sent.append({"chat_id": chat_id, "text": text, "button": button})

    monkeypatch.setattr(telegram, "send_message", fake_send)
    return sent


async def connect(store_id, chat_id: int = 777) -> None:
    async with tenant_session(store_id) as db:
        (await db.get(Store, store_id)).telegram_chat_id = str(chat_id)
        await db.commit()


# Rendering


def test_a_line_whose_tags_are_all_empty_is_left_out():
    template = "Total {total}\nDiscount −{discount}\n\nNote: {notes} {total}\nThanks"
    html = render(template, {"total": "$5", "discount": "", "notes": ""}, DEFAULT)
    # The blank line and the line without tags stay; a line with one tag
    # still filled stays too.
    assert html == "Total $5\n\nNote:  $5\nThanks"


def test_bold_and_escaping_and_a_customers_stars_stay_plain():
    html = render("**{customer} & co** <b>", {"customer": "**Dara** <VIP>"}, DEFAULT)
    assert html == "<b>**Dara** &lt;VIP&gt; &amp; co</b> &lt;b&gt;"


def test_small_words_and_rows_in_a_tag():
    texts = Texts(words={"stock.sold_out": "**gone**"})
    rows = [
        ["Cap <S>", ": ", word("stock.sold_out")],
        ["Hat", ": ", word("stock.only_left", left=2)],
    ]
    html = render("{items}", {"items": bot_texts.lines(rows)}, texts)
    assert html == "Cap &lt;S&gt;: <b>gone</b>\nHat: នៅសល់តែ 2 ទៀត"


def test_original_only_when_the_admins_words_differ():
    assert DEFAULT.html("signup_done", phone="012").original is None
    same = Texts(words={"tap.gone": "x"}).html("signup_done", phone="012")
    assert same.original is None
    changed = Texts(texts={"signup_done": "✅ {phone}"}).html("signup_done", phone="012")
    assert changed == "✅ 012"
    assert changed.original == DEFAULT.html("signup_done", phone="012")


def test_plain_words_for_buttons_and_taps_are_not_escaped():
    assert DEFAULT.plain("button.reply", shop="A & B") == "💬 ឆ្លើយតបទៅ A & B"


# The code's own words


@pytest.mark.parametrize("spec", MESSAGES.values(), ids=lambda m: m.key)
def test_every_message_passes_its_own_checks(spec):
    found = bot_texts.check(spec.text, spec.tags, spec.text)
    assert (found.errors, found.warnings) == ([], [])
    assert set(TAG.findall(spec.text)) == set(spec.tags)
    assert all(name in WORDS for name in spec.words)
    assert spec.can_off != bool(spec.stays_on)


@pytest.mark.parametrize("spec", WORDS.values(), ids=lambda w: w.key)
def test_every_small_word_passes_its_own_checks_and_is_shown_somewhere(spec):
    found = bot_texts.check(spec.text, spec.tags, spec.text, spec.kind)
    assert (found.errors, found.warnings) == ([], [])
    assert any(spec.key in m.words for m in MESSAGES.values())


def test_every_tag_has_a_label():
    tags = {t for m in MESSAGES.values() for t in m.tags} | {
        t for w in WORDS.values() for t in w.tags
    }
    assert tags <= set(TAG_LABELS)


# Checks before going live


def test_checks_refuse_what_would_break_the_message():
    tags = ("shop", "total")
    found = bot_texts.check("**{shop}\n{totl} {}\n{ total", tags, "{shop} {total}")
    assert found.errors == [
        "{totl} isn't a tag here. Tags: {shop} {total}.",
        "{} isn't a tag here. Tags: {shop} {total}.",
        "A { or } is missing its pair.",
        "A bold mark ** isn't closed on line 1.",
    ]
    assert found.warnings == ["{total} is gone, so “Total” won't show."]
    assert bot_texts.check("  ", tags, "{shop}").errors == [
        "Type the words, or use Back to original."
    ]
    assert bot_texts.check("x" * 4097, (), "x").errors == ["Too long: 4,097 of 4,096 characters."]


def test_checks_keep_buttons_and_tap_answers_plain():
    found = bot_texts.check("**Pay**\nnow", (), "Pay", "button", label="Button: pay")
    assert found.errors == [
        "Button: pay: This can't be bold.",
        "Button: pay: This must be one line.",
    ]
    assert bot_texts.check("x" * 201, (), "x", "note").errors == [
        "Too long: 201 of 200 characters."
    ]


# Saved, switched off, refused


async def test_saved_words_drop_the_codes_own_and_unknown_keys():
    await use(
        Texts(
            texts={"help": "Hi", "connected": MESSAGES["connected"].text},
            words={"button.pay": "Pay"},
            off=frozenset({"receipt"}),
        )
    )
    async with unscoped_session() as db:
        row = await db.get(PlatformSetting, bot_texts.KEY)
        assert row.value == {
            "texts": {"help": "Hi"},
            "words": {"button.pay": "Pay"},
            "off": ["receipt"],
        }
        # Keys the code no longer has, and a message that can't be off.
        row.value = {**row.value, "texts": {"help": "Hi", "gone": "x"}, "off": ["receipt", "help"]}
        await db.commit()
    texts = await bot_texts.load()
    assert texts.texts == {"help": "Hi"}
    assert texts.off == {"receipt"}
    assert texts.html("help") == "Hi"


async def test_the_sellers_alert_uses_the_new_words(client, bot, auth_headers):
    _, store_id, slug = await registered_seller(client, auth_headers)
    await connect(store_id)
    cap = await add_product(store_id, "cap", stock=20)
    await use(
        Texts(
            texts={"new_order": "🛒 **Order #{number}**\n{items}\n📝 {notes}"},
            words={"button.open_order": "Open it"},
        )
    )
    placed = await place_order(client, slug, [(cap, None, 2)], total="20.00")
    assert placed.status_code == 201, placed.text
    [alert] = bot
    # No note, no note line.
    assert alert["text"] == "🛒 <b>Order #1001</b>\n2 × Cap: $20.00"
    assert "សរុប" in alert["text"].original  # Total, in the code's words
    assert alert["button"][0] == "Open it"


async def test_a_message_turned_off_is_not_sent(client, bot, auth_headers):
    _, store_id, slug = await registered_seller(client, auth_headers)
    await connect(store_id)
    cap = await add_product(store_id, "cap", stock=7)
    await use(Texts(off=frozenset({"new_order"})))
    placed = await place_order(client, slug, [(cap, None, 2)], total="20.00")
    assert placed.status_code == 201, placed.text
    # Low stock is its own message and still goes.
    assert [m["text"].splitlines()[0] for m in bot] == ["⚠️ <b>ជិតអស់ស្តុក</b>"]


async def test_refused_new_words_go_again_in_the_codes(monkeypatch):
    monkeypatch.setattr(get_settings(), "telegram_bot_token", "123:abc")
    calls: list[str] = []

    async def fake_call(method, payload):
        calls.append(payload["text"])
        if len(calls) == 1:
            raise telegram.TelegramError(400, "Bad Request: message text is empty")
        return {}

    monkeypatch.setattr(telegram, "call", fake_call)
    before = telegram.refused_since(time.time() - 1)
    await telegram.send_message(1, Texts(texts={"help": "Hi"}).html("help"))
    assert calls == ["Hi", DEFAULT.html("help")]
    assert telegram.refused_since(time.time() - 60) == before + 1

    # The code's own words, or a blocked chat, aren't sent twice.
    calls.clear()
    with pytest.raises(telegram.TelegramError):
        await telegram.send_message(1, DEFAULT.html("help"))
    assert len(calls) == 1
