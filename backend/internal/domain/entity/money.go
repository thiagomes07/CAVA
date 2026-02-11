package entity

func AmountToFloat(amount int64) float64 {
	return float64(amount) / 100.0
}

func AmountFromFloat(value float64) int64 {
	if value <= 0 {
		return 0
	}
	return int64(value*100.0 + 0.5)
}

