use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use std::str::FromStr;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum CalculationError {
    #[error("{field} must be a valid decimal number")]
    InvalidDecimal { field: &'static str },
    #[error("stop must be below entry for a long plan and above entry for a short plan")]
    InvalidStop,
    #[error("maximum risk must be positive")]
    InvalidMaximumRisk,
    #[error("quantity must be positive")]
    InvalidQuantity,
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

fn decimal(value: &str, field: &'static str) -> Result<Decimal, CalculationError> {
    let normalized = if value.trim().is_empty() {
        "0"
    } else {
        value.trim()
    };
    Decimal::from_str(normalized).map_err(|_| CalculationError::InvalidDecimal { field })
}

fn money(value: Decimal) -> String {
    value.round_dp(2).to_string()
}

fn precise(value: Decimal) -> String {
    value.round_dp(6).normalize().to_string()
}

pub fn position_size(
    request: &PositionSizeRequest,
) -> Result<PositionSizeResult, CalculationError> {
    let entry = decimal(&request.entry, "entry")?;
    let stop = decimal(&request.stop, "stop")?;
    let maximum_risk = decimal(&request.maximum_risk, "maximum_risk")?;
    let slippage = decimal(&request.slippage_per_unit, "slippage_per_unit")?;

    if maximum_risk <= Decimal::ZERO {
        return Err(CalculationError::InvalidMaximumRisk);
    }

    let technical_risk = if request.side == "short" {
        stop - entry
    } else {
        entry - stop
    };
    if technical_risk <= Decimal::ZERO {
        return Err(CalculationError::InvalidStop);
    }

    let risk_per_unit = technical_risk + slippage;
    if risk_per_unit <= Decimal::ZERO {
        return Err(CalculationError::InvalidStop);
    }

    let quantity_decimal = (maximum_risk / risk_per_unit).floor();
    let quantity = quantity_decimal.to_string().parse::<u64>().unwrap_or(0);
    let planned_risk = Decimal::from(quantity) * risk_per_unit;

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

    if quantity <= Decimal::ZERO {
        return Err(CalculationError::InvalidQuantity);
    }

    let gross = if request.side == "short" {
        (entry - exit) * quantity * multiplier
    } else {
        (exit - entry) * quantity * multiplier
    };
    let net = gross - fees;
    let planned_risk = request
        .planned_risk
        .as_ref()
        .and_then(|value| decimal(value, "planned_risk").ok())
        .filter(|value| *value > Decimal::ZERO);
    let r_multiple = planned_risk.map(|risk| precise(net / risk));
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sizes_long_with_slippage() {
        let result = position_size(&PositionSizeRequest {
            entry: "32.40".into(),
            stop: "32.12".into(),
            maximum_risk: "28".into(),
            slippage_per_unit: "0.02".into(),
            side: "long".into(),
        })
        .unwrap();
        assert_eq!(result.quantity, 93);
        assert_eq!(result.planned_risk, "27.90");
    }

    #[test]
    fn keeps_process_math_independent_of_outcome() {
        let result = trade_result(&TradeResultRequest {
            entry: "50".into(),
            exit: "50.40".into(),
            quantity: "100".into(),
            fees: "1".into(),
            multiplier: "1".into(),
            side: "long".into(),
            planned_risk: Some("20".into()),
        })
        .unwrap();
        assert_eq!(result.net_pnl, "39.00");
        assert_eq!(result.r_multiple.as_deref(), Some("1.95"));
    }
}
