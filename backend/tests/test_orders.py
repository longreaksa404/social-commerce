"""The order state machine (02_TECHNICAL.md section 7.1) and the seller's
order endpoints."""

from itertools import product

import pytest

from app.core.errors import AppError
from app.models import Order, OrderStatus
from app.services.order import check_transition, next_statuses, transition

S = OrderStatus

# Copied from 02_TECHNICAL.md section 7.1 on purpose, not imported: a
# change to the service's table has to be made here too, deliberately.
EXPECTED = {
    S.PENDING: {S.ACCEPTED, S.REJECTED},
    S.ACCEPTED: {S.PROCESSING, S.CANCELLED},
    S.PROCESSING: {S.READY, S.CANCELLED},
    S.READY: {S.SHIPPED, S.CANCELLED},
    S.SHIPPED: {S.DELIVERED},
    S.DELIVERED: {S.COMPLETED},
    S.COMPLETED: set(),
    S.REJECTED: set(),
    S.CANCELLED: set(),
}


@pytest.mark.parametrize(("current", "target"), list(product(S, S)))
def test_every_transition_follows_the_state_machine(current, target):
    if target in EXPECTED[current]:
        check_transition(current, target)
    else:
        with pytest.raises(AppError) as error:
            check_transition(current, target)
        assert (error.value.status_code, error.value.code) == (409, "INVALID_STATUS_TRANSITION")


def test_next_statuses_offer_the_allowed_moves_in_order():
    assert next_statuses(Order(status=S.PENDING)) == [S.ACCEPTED, S.REJECTED]
    assert next_statuses(Order(status=S.READY)) == [S.SHIPPED, S.CANCELLED]
    assert next_statuses(Order(status=S.CANCELLED)) == []


async def test_an_order_cannot_complete_before_its_payment_is_settled():
    """02 section 7.4. Payments arrive in Phase 4; until then none can."""
    order = Order(status=S.DELIVERED, items=[])

    assert next_statuses(order) == []
    with pytest.raises(AppError) as error:
        await transition(None, order, S.COMPLETED)
    assert error.value.code == "ORDER_NOT_PAID"
    assert order.status is S.DELIVERED
