use rust_decimal::{Decimal, RoundingStrategy, prelude::ToPrimitive};
use serde::{Deserialize, Serialize};
use std::str::FromStr;
use thiserror::Error;

const INPUT_SCALE: u32 = 6;
const MAX_SAFE_INTEGER_QUANTITY: u64 = 9_007_199_254_740_991;

#[derive(Debug, Error, PartialEq)]
pub enum CalculationError {
    #[error("{field} must be a valid decimal number")]
    InvalidDecimal { field: &'static str },
    #[error("{field} may contain at most six decimal places")]
    TooManyDecimalPlaces { field: &'static str },
    #[error("entry and exit prices must be positive")]
    InvalidPrice,
    #[error("side must be either long or short")]
    InvalidSide,
    #[error("stop must be below entry for a long plan and above entry for a short plan")]
    InvalidStop,
    #[error("maximum risk must be positive")]
    InvalidMaximumRisk,
    #[error("slippage per unit must be zero or greater")]
    InvalidSlippage,
    #[error("quantity must be positive")]
    InvalidQuantity,
    #[error("fees must be zero or greater")]
    InvalidFees,
    #[error("multiplier must be positive")]
    InvalidMultiplier,
    #[error("planned risk must be a positive decimal when supplied")]
    InvalidPlannedRisk,
    #[error("the calculated whole-unit quantity is too large")]
    QuantityOverflow,
    #[error("the calculation exceeds the supported numeric range")]
    ArithmeticOverflow,
    #[error("win rate must be between 0 and 100 percent")]
    InvalidWinRate,
    #[error("average win must be between zero and 1,000,000 R")]
    InvalidAverageWin,
    #[error("average loss must be greater than zero and no more than 1,000,000 R")]
    InvalidAverageLoss,
}

#[derive(Debug, Clone, Deserialize)]
pub struct PositionSizeRequest {
    pub entry: String,
    pub stop: String,
    pub maximum_risk: String,
    #[serde(default)]
    pub slippage_per_unit: String,
    pub side: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct PositionSizeResult {
    pub technical_risk_per_unit: String,
    pub risk_per_unit: String,
    pub quantity: u64,
    pub planned_risk: String,
    pub binding_constraint: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct TradeResultRequest {
    pub entry: String,
    pub exit: String,
    pub quantity: String,
    #[serde(default)]
    pub fees: String,
    #[serde(default = "default_multiplier")]
    pub multiplier: String,
    pub side: String,
    pub planned_risk: Option<String>,
}

fn default_multiplier() -> String {
    "1".to_string()
}

#[derive(Debug, Clone, Serialize)]
pub struct TradeResult {
    pub gross_pnl: String,
    pub net_pnl: String,
    pub r_multiple: Option<String>,
    pub outcome: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ExpectancyRequest {
    pub win_rate_percent: String,
    pub average_win_r: String,
    pub average_loss_r: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct ExpectancyResult {
    pub expectancy_r: String,
    pub break_even_win_rate: String,
    pub expected_r_per_100_observations: String,
}

fn decimal(value: &str, field: &'static str) -> Result<Decimal, CalculationError> {
    let normalized = if value.trim().is_empty() {
        "0"
    } else {
        value.trim()
    };
    let parsed =
        Decimal::from_str(normalized).map_err(|_| CalculationError::InvalidDecimal { field })?;
    if parsed.scale() > INPUT_SCALE {
        return Err(CalculationError::TooManyDecimalPlaces { field });
    }
    Ok(parsed)
}

fn is_short(side: &str) -> Result<bool, CalculationError> {
    match side.trim().to_ascii_lowercase().as_str() {
        "long" => Ok(false),
        "short" => Ok(true),
        _ => Err(CalculationError::InvalidSide),
    }
}

fn round_six(value: Decimal) -> Decimal {
    value.round_dp_with_strategy(INPUT_SCALE, RoundingStrategy::MidpointAwayFromZero)
}

fn money(value: Decimal) -> String {
    value
        .round_dp_with_strategy(2, RoundingStrategy::MidpointAwayFromZero)
        .to_string()
}

fn precise(value: Decimal) -> String {
    round_six(value).normalize().to_string()
}

pub fn position_size(
    request: &PositionSizeRequest,
) -> Result<PositionSizeResult, CalculationError> {
    let entry = decimal(&request.entry, "entry")?;
    let stop = decimal(&request.stop, "stop")?;
    let maximum_risk = decimal(&request.maximum_risk, "maximum_risk")?;
    let slippage = decimal(&request.slippage_per_unit, "slippage_per_unit")?;
    let short = is_short(&request.side)?;

    if entry <= Decimal::ZERO || stop <= Decimal::ZERO {
        return Err(CalculationError::InvalidPrice);
    }
    if maximum_risk <= Decimal::ZERO {
        return Err(CalculationError::InvalidMaximumRisk);
    }
    if slippage < Decimal::ZERO {
        return Err(CalculationError::InvalidSlippage);
    }

    let technical_risk = if short {
        stop.checked_sub(entry)
    } else {
        entry.checked_sub(stop)
    }
    .ok_or(CalculationError::ArithmeticOverflow)?;
    if technical_risk <= Decimal::ZERO {
        return Err(CalculationError::InvalidStop);
    }

    let risk_per_unit = technical_risk
        .checked_add(slippage)
        .ok_or(CalculationError::ArithmeticOverflow)?;
    let quantity_decimal = maximum_risk
        .checked_div(risk_per_unit)
        .ok_or(CalculationError::ArithmeticOverflow)?
        .floor();
    let quantity = quantity_decimal
        .to_u64()
        .ok_or(CalculationError::QuantityOverflow)?;
    if quantity > MAX_SAFE_INTEGER_QUANTITY {
        return Err(CalculationError::QuantityOverflow);
    }
    let planned_risk = Decimal::from(quantity)
        .checked_mul(risk_per_unit)
        .ok_or(CalculationError::ArithmeticOverflow)?;

    Ok(PositionSizeResult {
        technical_risk_per_unit: precise(technical_risk),
        risk_per_unit: precise(risk_per_unit),
        quantity,
        planned_risk: money(planned_risk),
        binding_constraint: "maximum_risk".to_string(),
    })
}

pub fn trade_result(request: &TradeResultRequest) -> Result<TradeResult, CalculationError> {
    let entry = decimal(&request.entry, "entry")?;
    let exit = decimal(&request.exit, "exit")?;
    let quantity = decimal(&request.quantity, "quantity")?;
    let fees = decimal(&request.fees, "fees")?;
    let multiplier = decimal(&request.multiplier, "multiplier")?;
    let short = is_short(&request.side)?;

    if entry <= Decimal::ZERO || exit <= Decimal::ZERO {
        return Err(CalculationError::InvalidPrice);
    }
    if quantity <= Decimal::ZERO {
        return Err(CalculationError::InvalidQuantity);
    }
    if fees < Decimal::ZERO {
        return Err(CalculationError::InvalidFees);
    }
    if multiplier <= Decimal::ZERO {
        return Err(CalculationError::InvalidMultiplier);
    }

    let difference = if short {
        entry.checked_sub(exit)
    } else {
        exit.checked_sub(entry)
    }
    .ok_or(CalculationError::ArithmeticOverflow)?;
    let gross = difference
        .checked_mul(quantity)
        .and_then(|value| value.checked_mul(multiplier))
        .map(round_six)
        .ok_or(CalculationError::ArithmeticOverflow)?;
    let net = gross
        .checked_sub(fees)
        .ok_or(CalculationError::ArithmeticOverflow)?;
    let planned_risk = match request.planned_risk.as_deref() {
        None | Some("") => None,
        Some(value) if value.trim().is_empty() => None,
        Some(value) => {
            let risk = decimal(value, "planned_risk")?;
            if risk <= Decimal::ZERO {
                return Err(CalculationError::InvalidPlannedRisk);
            }
            Some(risk)
        }
    };
    let r_multiple = planned_risk
        .map(|risk| {
            net.checked_div(risk)
                .map(precise)
                .ok_or(CalculationError::ArithmeticOverflow)
        })
        .transpose()?;
    let outcome = if net > Decimal::ZERO {
        "profitable"
    } else if net < Decimal::ZERO {
        "losing"
    } else {
        "flat"
    };

    Ok(TradeResult {
        gross_pnl: money(gross),
        net_pnl: money(net),
        r_multiple,
        outcome: outcome.to_string(),
    })
}

pub fn expectancy(request: &ExpectancyRequest) -> Result<ExpectancyResult, CalculationError> {
    let win_rate = decimal(&request.win_rate_percent, "win_rate_percent")?;
    let average_win = decimal(&request.average_win_r, "average_win_r")?;
    let average_loss = decimal(&request.average_loss_r, "average_loss_r")?;
    let hundred = Decimal::from(100);
    let maximum_r = Decimal::from(1_000_000);

    if win_rate < Decimal::ZERO || win_rate > hundred {
        return Err(CalculationError::InvalidWinRate);
    }
    if average_win < Decimal::ZERO || average_win > maximum_r {
        return Err(CalculationError::InvalidAverageWin);
    }
    if average_loss <= Decimal::ZERO || average_loss > maximum_r {
        return Err(CalculationError::InvalidAverageLoss);
    }

    let weighted_win = win_rate
        .checked_mul(average_win)
        .ok_or(CalculationError::ArithmeticOverflow)?;
    let loss_rate = hundred
        .checked_sub(win_rate)
        .ok_or(CalculationError::ArithmeticOverflow)?;
    let weighted_loss = loss_rate
        .checked_mul(average_loss)
        .ok_or(CalculationError::ArithmeticOverflow)?;
    let expectancy = weighted_win
        .checked_sub(weighted_loss)
        .and_then(|value| value.checked_div(hundred))
        .map(round_six)
        .ok_or(CalculationError::ArithmeticOverflow)?;
    let payoff_total = average_win
        .checked_add(average_loss)
        .ok_or(CalculationError::ArithmeticOverflow)?;
    let break_even = average_loss
        .checked_div(payoff_total)
        .and_then(|value| value.checked_mul(hundred))
        .map(round_six)
        .ok_or(CalculationError::ArithmeticOverflow)?;
    let expected_per_hundred = expectancy
        .checked_mul(hundred)
        .map(round_six)
        .ok_or(CalculationError::ArithmeticOverflow)?;

    Ok(ExpectancyResult {
        expectancy_r: precise(expectancy),
        break_even_win_rate: precise(break_even),
        expected_r_per_100_observations: precise(expected_per_hundred),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn position_request() -> PositionSizeRequest {
        PositionSizeRequest {
            entry: "32.40".into(),
            stop: "32.12".into(),
            maximum_risk: "28".into(),
            slippage_per_unit: "0.02".into(),
            side: "long".into(),
        }
    }

    fn trade_request() -> TradeResultRequest {
        TradeResultRequest {
            entry: "50".into(),
            exit: "50.40".into(),
            quantity: "100".into(),
            fees: "1".into(),
            multiplier: "1".into(),
            side: "long".into(),
            planned_risk: Some("20".into()),
        }
    }

    #[test]
    fn sizes_long_with_slippage() {
        let result = position_size(&position_request()).unwrap();
        assert_eq!(result.quantity, 93);
        assert_eq!(result.planned_risk, "27.90");
    }

    #[test]
    fn sizes_short_and_rounds_whole_units_down() {
        let mut request = position_request();
        request.entry = "32.12".into();
        request.stop = "32.40".into();
        request.side = "SHORT".into();
        let result = position_size(&request).unwrap();
        assert_eq!(result.quantity, 93);
    }

    #[test]
    fn keeps_process_math_independent_of_outcome() {
        let result = trade_result(&trade_request()).unwrap();
        assert_eq!(result.net_pnl, "39.00");
        assert_eq!(result.r_multiple.as_deref(), Some("1.95"));
    }

    #[test]
    fn retains_six_decimal_r_multiple_precision() {
        let mut request = trade_request();
        request.exit = "50.333333".into();
        request.quantity = "3".into();
        request.fees = "0".into();
        request.planned_risk = Some("3".into());
        assert_eq!(
            trade_result(&request).unwrap().r_multiple.as_deref(),
            Some("0.333333")
        );
    }

    #[test]
    fn rejects_invalid_side_price_slippage_and_precision() {
        let mut request = position_request();
        request.side = "buy".into();
        assert_eq!(
            position_size(&request).unwrap_err(),
            CalculationError::InvalidSide
        );
        request.side = "long".into();
        request.entry = "0".into();
        assert_eq!(
            position_size(&request).unwrap_err(),
            CalculationError::InvalidPrice
        );
        request.entry = "32.40".into();
        request.slippage_per_unit = "-0.01".into();
        assert_eq!(
            position_size(&request).unwrap_err(),
            CalculationError::InvalidSlippage
        );
        request.slippage_per_unit = "0.0000001".into();
        assert!(matches!(
            position_size(&request),
            Err(CalculationError::TooManyDecimalPlaces { .. })
        ));
    }

    #[test]
    fn rejects_negative_costs_and_invalid_risk_or_multiplier() {
        let mut request = trade_request();
        request.fees = "-1".into();
        assert_eq!(
            trade_result(&request).unwrap_err(),
            CalculationError::InvalidFees
        );
        request.fees = "0".into();
        request.multiplier = "0".into();
        assert_eq!(
            trade_result(&request).unwrap_err(),
            CalculationError::InvalidMultiplier
        );
        request.multiplier = "1".into();
        request.planned_risk = Some("not-a-number".into());
        assert!(matches!(
            trade_result(&request),
            Err(CalculationError::InvalidDecimal {
                field: "planned_risk"
            })
        ));
        request.planned_risk = Some("0".into());
        assert_eq!(
            trade_result(&request).unwrap_err(),
            CalculationError::InvalidPlannedRisk
        );
    }

    #[test]
    fn rejects_quantity_that_cannot_cross_the_desktop_json_boundary_safely() {
        let mut request = position_request();
        request.entry = "10.000001".into();
        request.stop = "10".into();
        request.maximum_risk = "10000000000".into();
        request.slippage_per_unit = "0".into();
        assert_eq!(
            position_size(&request).unwrap_err(),
            CalculationError::QuantityOverflow
        );
    }

    #[test]
    fn calculates_expectancy_and_break_even_with_decimal_arithmetic() {
        let result = expectancy(&ExpectancyRequest {
            win_rate_percent: "45".into(),
            average_win_r: "2".into(),
            average_loss_r: "1".into(),
        })
        .unwrap();
        assert_eq!(result.expectancy_r, "0.35");
        assert_eq!(result.break_even_win_rate, "33.333333");
        assert_eq!(result.expected_r_per_100_observations, "35");
    }

    #[test]
    fn rejects_invalid_expectancy_inputs() {
        let mut request = ExpectancyRequest {
            win_rate_percent: "101".into(),
            average_win_r: "2".into(),
            average_loss_r: "1".into(),
        };
        assert_eq!(
            expectancy(&request).unwrap_err(),
            CalculationError::InvalidWinRate
        );
        request.win_rate_percent = "45".into();
        request.average_win_r = "-1".into();
        assert_eq!(
            expectancy(&request).unwrap_err(),
            CalculationError::InvalidAverageWin
        );
        request.average_win_r = "2".into();
        request.average_loss_r = "0".into();
        assert_eq!(
            expectancy(&request).unwrap_err(),
            CalculationError::InvalidAverageLoss
        );
    }
}
