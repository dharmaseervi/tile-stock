package models

import "time"

type Org struct {
	ID        string    `db:"id" json:"id"`
	Name      string    `db:"name" json:"name"`
	CreatedAt time.Time `db:"created_at" json:"created_at"`
}

type User struct {
	ID           string    `db:"id" json:"id"`
	OrgID        string    `db:"org_id" json:"org_id"`
	Email        string    `db:"email" json:"email"`
	PasswordHash string    `db:"password_hash" json:"-"`
	Role         string    `db:"role" json:"role"`
	CreatedAt    time.Time `db:"created_at" json:"created_at"`
}

type Product struct {
	ID           string    `db:"id" json:"id"`
	OrgID        string    `db:"org_id" json:"org_id"`
	Brand        string    `db:"brand" json:"brand"`
	SeriesName   string    `db:"series_name" json:"series_name"`
	Size         string    `db:"size" json:"size"`
	Finish       *string   `db:"finish" json:"finish"`
	HSNCode      *string   `db:"hsn_code" json:"hsn_code"`
	PiecesPerBox int       `db:"pieces_per_box" json:"pieces_per_box"`
	SqftPerBox   *float64  `db:"sqft_per_box" json:"sqft_per_box"`
	ReorderLevel int       `db:"reorder_level" json:"reorder_level"`
	PricePerBox  float64   `db:"price_per_box" json:"price_per_box"`
	ImageURL     *string   `db:"image_url" json:"image_url"`
	CreatedAt    time.Time `db:"created_at" json:"created_at"`
}

type Batch struct {
	ID         string     `db:"id" json:"id"`
	OrgID      string     `db:"org_id" json:"org_id"`
	ProductID  string     `db:"product_id" json:"product_id"`
	LotNumber  string     `db:"lot_number" json:"lot_number"`
	ReceivedAt *time.Time `db:"received_at" json:"received_at"`
	CreatedAt  time.Time  `db:"created_at" json:"created_at"`
}

type StockMovement struct {
	ID           string    `db:"id" json:"id"`
	OrgID        string    `db:"org_id" json:"org_id"`
	ProductID    string    `db:"product_id" json:"product_id"`
	BatchID      *string   `db:"batch_id" json:"batch_id"`
	MovementType string    `db:"movement_type" json:"movement_type"` // in | out
	Boxes        float64   `db:"boxes" json:"boxes"`
	Reference    *string   `db:"reference" json:"reference"`
	CreatedBy    *string   `db:"created_by" json:"created_by"`
	CreatedAt    time.Time `db:"created_at" json:"created_at"`
}

type CurrentStock struct {
	ProductID    string  `db:"product_id" json:"product_id"`
	OrgID        string  `db:"org_id" json:"org_id"`
	Brand        string  `db:"brand" json:"brand"`
	SeriesName   string  `db:"series_name" json:"series_name"`
	Size         string  `db:"size" json:"size"`
	Finish       *string `db:"finish" json:"finish"`
	ReorderLevel int     `db:"reorder_level" json:"reorder_level"`
	PricePerBox  float64 `db:"price_per_box" json:"price_per_box"`
	BoxesInStock float64 `db:"boxes_in_stock" json:"boxes_in_stock"`
	StockValue   float64 `db:"stock_value" json:"stock_value"`
}
