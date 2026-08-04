package handlers

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
	"github.com/jung-kurt/gofpdf"
)

type PDFHandler struct{ DB *sqlx.DB }

// ── helpers ───────────────────────────────────────────────────────────────

func newPDF() *gofpdf.Fpdf {
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.SetMargins(15, 15, 15)
	pdf.SetAutoPageBreak(true, 15)
	return pdf
}

func drawHeader(pdf *gofpdf.Fpdf, orgName string) {
	pdf.SetFont("Arial", "B", 16)
	pdf.SetTextColor(31, 111, 107) // --color-glaze
	pdf.CellFormat(0, 10, "PERFORMA REPORT", "", 1, "L", false, 0, "")

	pdf.SetFont("Arial", "", 9)
	pdf.SetTextColor(82, 96, 91) // --color-ink-soft
	pdf.CellFormat(0, 5, orgName, "", 1, "L", false, 0, "")
	pdf.Ln(3)

	// Separator
	pdf.SetDrawColor(220, 223, 217)
	pdf.Line(15, pdf.GetY(), 195, pdf.GetY())
	pdf.Ln(4)
}

func drawInfoBox(pdf *gofpdf.Fpdf, challanNum, date, customerName, city, address string) {
	pdf.SetFillColor(247, 248, 246) // --color-kiln
	pdf.SetDrawColor(220, 223, 217)
	pdf.SetFont("Arial", "", 9)

	y := pdf.GetY()
	pdf.RoundedRect(15, y, 180, 28, 2, "1234", "FD")

	pdf.SetXY(19, y+4)
	pdf.SetFont("Arial", "B", 8)
	pdf.SetTextColor(82, 96, 91)
	pdf.CellFormat(20, 5, "Challan No:", "", 0, "L", false, 0, "")
	pdf.SetFont("Arial", "", 8)
	pdf.SetTextColor(30, 36, 34)
	pdf.CellFormat(50, 5, challanNum, "", 0, "L", false, 0, "")

	pdf.SetFont("Arial", "B", 8)
	pdf.SetTextColor(82, 96, 91)
	pdf.CellFormat(20, 5, "Date:", "", 0, "L", false, 0, "")
	pdf.SetFont("Arial", "", 8)
	pdf.SetTextColor(30, 36, 34)
	pdf.CellFormat(0, 5, date, "", 1, "L", false, 0, "")

	pdf.SetXY(19, y+11)
	pdf.SetFont("Arial", "B", 8)
	pdf.SetTextColor(82, 96, 91)
	pdf.CellFormat(20, 5, "Party:", "", 0, "L", false, 0, "")
	pdf.SetFont("Arial", "", 8)
	pdf.SetTextColor(30, 36, 34)
	pdf.CellFormat(50, 5, customerName, "", 0, "L", false, 0, "")

	if city != "" {
		pdf.SetFont("Arial", "B", 8)
		pdf.SetTextColor(82, 96, 91)
		pdf.CellFormat(20, 5, "City:", "", 0, "L", false, 0, "")
		pdf.SetFont("Arial", "", 8)
		pdf.SetTextColor(30, 36, 34)
		pdf.CellFormat(0, 5, city, "", 1, "L", false, 0, "")
	}

	if address != "" {
		pdf.SetXY(19, y+18)
		pdf.SetFont("Arial", "B", 8)
		pdf.SetTextColor(82, 96, 91)
		pdf.CellFormat(20, 5, "Address:", "", 0, "L", false, 0, "")
		pdf.SetFont("Arial", "", 8)
		pdf.SetTextColor(30, 36, 34)
		pdf.CellFormat(0, 5, address, "", 1, "L", false, 0, "")
	}

	pdf.SetXY(15, y+30)
	pdf.Ln(2)
}

func drawItemsTableHeader(pdf *gofpdf.Fpdf) {
	pdf.SetFillColor(31, 111, 107) // glaze
	pdf.SetTextColor(255, 255, 255)
	pdf.SetFont("Arial", "B", 8)
	pdf.SetDrawColor(255, 255, 255)

	pdf.CellFormat(8, 7, "#", "1", 0, "C", true, 0, "")
	pdf.CellFormat(70, 7, "Design / Series", "1", 0, "L", true, 0, "")
	pdf.CellFormat(25, 7, "Size", "1", 0, "C", true, 0, "")
	pdf.CellFormat(20, 7, "Finish", "1", 0, "C", true, 0, "")
	pdf.CellFormat(15, 7, "Boxes", "1", 0, "R", true, 0, "")
	pdf.CellFormat(20, 7, "Rate/Box", "1", 0, "R", true, 0, "")
	pdf.CellFormat(22, 7, "Amount", "1", 1, "R", true, 0, "")
}

// ── Order Performa PDF ─────────────────────────────────────────────────────

func (h *PDFHandler) OrderPDF(c *gin.Context) {
	orgID := c.GetString("org_id")
	orderID := c.Param("id")

	// Fetch org name
	var orgName string
	h.DB.Get(&orgName, `SELECT name FROM orgs WHERE id=$1`, orgID)

	// Fetch order
	var order struct {
		ID              string    `db:"id"`
		ChallanNumber   string    `db:"challan_number"`
		Status          string    `db:"status"`
		CustomerName    *string   `db:"customer_name"`
		CustomerPhone   *string   `db:"customer_phone"`
		DeliveryAddress *string   `db:"delivery_address"`
		Notes           *string   `db:"notes"`
		CreatedAt       time.Time `db:"created_at"`
	}
	err := h.DB.Get(&order, `
		SELECT o.id, o.challan_number, o.status, o.delivery_address, o.notes, o.created_at,
			cu.name AS customer_name, cu.phone AS customer_phone
		FROM orders o
		LEFT JOIN customers cu ON cu.id = o.customer_id
		WHERE o.id=$1 AND o.org_id=$2
	`, orderID, orgID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "order not found"})
		return
	}

	// Fetch items
	var items []struct {
		Brand       string  `db:"brand"`
		SeriesName  string  `db:"series_name"`
		Size        string  `db:"size"`
		Finish      *string `db:"finish"`
		Boxes       float64 `db:"boxes"`
		PricePerBox float64 `db:"price_per_box"`
		Notes       *string `db:"notes"`
	}
	h.DB.Select(&items, `
		SELECT p.brand, p.series_name, p.size, p.finish,
			oi.boxes, oi.price_per_box, oi.notes
		FROM order_items oi
		JOIN products p ON p.id = oi.product_id
		WHERE oi.order_id=$1
		ORDER BY p.brand, p.series_name
	`, orderID)

	// Build PDF
	pdf := newPDF()
	pdf.AddPage()

	drawHeader(pdf, orgName)

	customerName := "—"
	if order.CustomerName != nil {
		customerName = *order.CustomerName
		if order.CustomerPhone != nil {
			customerName += " (" + *order.CustomerPhone + ")"
		}
	}
	city := ""
	address := ""
	if order.DeliveryAddress != nil {
		address = *order.DeliveryAddress
	}
	drawInfoBox(pdf, order.ChallanNumber, order.CreatedAt.Format("02/01/2006"), customerName, city, address)

	// Items table
	drawItemsTableHeader(pdf)

	var totalBoxes, totalAmount float64
	pdf.SetFont("Arial", "", 8)
	pdf.SetDrawColor(220, 223, 217)

	for i, item := range items {
		if pdf.GetY() > 260 {
			pdf.AddPage()
			drawItemsTableHeader(pdf)
		}

		amount := item.Boxes * item.PricePerBox
		totalBoxes += item.Boxes
		totalAmount += amount

		finish := "—"
		if item.Finish != nil {
			finish = *item.Finish
		}
		design := item.Brand + " " + item.SeriesName
		if item.Notes != nil && *item.Notes != "" {
			design += " (" + *item.Notes + ")"
		}

		fill := i%2 == 0
		if fill {
			pdf.SetFillColor(247, 248, 246)
		} else {
			pdf.SetFillColor(255, 255, 255)
		}
		pdf.SetTextColor(30, 36, 34)

		pdf.CellFormat(8, 7, fmt.Sprintf("%d", i+1), "1", 0, "C", fill, 0, "")
		pdf.CellFormat(70, 7, design, "1", 0, "L", fill, 0, "")
		pdf.CellFormat(25, 7, item.Size, "1", 0, "C", fill, 0, "")
		pdf.CellFormat(20, 7, finish, "1", 0, "C", fill, 0, "")
		pdf.CellFormat(15, 7, fmt.Sprintf("%.0f", item.Boxes), "1", 0, "R", fill, 0, "")
		if item.PricePerBox > 0 {
			pdf.CellFormat(20, 7, fmt.Sprintf("%.2f", item.PricePerBox), "1", 0, "R", fill, 0, "")
			pdf.CellFormat(22, 7, fmt.Sprintf("%.0f", amount), "1", 1, "R", fill, 0, "")
		} else {
			pdf.CellFormat(20, 7, "—", "1", 0, "R", fill, 0, "")
			pdf.CellFormat(22, 7, "—", "1", 1, "R", fill, 0, "")
		}
	}

	// Totals row
	pdf.SetFillColor(31, 111, 107)
	pdf.SetTextColor(255, 255, 255)
	pdf.SetFont("Arial", "B", 9)
	pdf.CellFormat(138, 8, "TOTAL", "1", 0, "R", true, 0, "")
	pdf.CellFormat(15, 8, fmt.Sprintf("%.0f", totalBoxes), "1", 0, "R", true, 0, "")
	pdf.CellFormat(20, 8, "", "1", 0, "R", true, 0, "")
	if totalAmount > 0 {
		pdf.CellFormat(22, 8, fmt.Sprintf("%.0f", totalAmount), "1", 1, "R", true, 0, "")
	} else {
		pdf.CellFormat(22, 8, "—", "1", 1, "R", true, 0, "")
	}

	// Footer
	pdf.Ln(8)
	pdf.SetFont("Arial", "", 8)
	pdf.SetTextColor(82, 96, 91)
	if order.Notes != nil && *order.Notes != "" {
		pdf.CellFormat(0, 5, "Notes: "+*order.Notes, "", 1, "L", false, 0, "")
		pdf.Ln(3)
	}

	pdf.SetFont("Arial", "I", 7)
	pdf.SetTextColor(180, 180, 180)
	pdf.CellFormat(0, 5, fmt.Sprintf("Generated on %s · %s", time.Now().Format("02 Jan 2006"), orgName), "", 1, "C", false, 0, "")

	// Serve
	c.Header("Content-Type", "application/pdf")
	c.Header("Content-Disposition", fmt.Sprintf(`attachment; filename="challan-%s.pdf"`, order.ChallanNumber))
	pdf.Output(c.Writer)
}

// ── Purchase Order PDF ─────────────────────────────────────────────────────

type poItem struct {
	ProductID   string  `json:"product_id"`
	Boxes       float64 `json:"boxes"`
	PricePerBox float64 `json:"price_per_box"`
}

type poReq struct {
	SupplierID string   `json:"supplier_id"`
	Notes      string   `json:"notes"`
	Items      []poItem `json:"items"`
}

func (h *PDFHandler) PurchaseOrderPDF(c *gin.Context) {
	orgID := c.GetString("org_id")

	var orgName string
	h.DB.Get(&orgName, `SELECT name FROM orgs WHERE id=$1`, orgID)

	var req poReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Fetch supplier
	supplierName := ""
	supplierPhone := ""
	if req.SupplierID != "" {
		var sup struct {
			Name  string  `db:"name"`
			Phone *string `db:"phone"`
		}
		if err := h.DB.Get(&sup, `SELECT name, phone FROM suppliers WHERE id=$1 AND org_id=$2`, req.SupplierID, orgID); err == nil {
			supplierName = sup.Name
			if sup.Phone != nil {
				supplierPhone = *sup.Phone
			}
		}
	}

	// Fetch product details for each item
	type lineItem struct {
		Brand      string
		SeriesName string
		Size       string
		Finish     string
		Boxes      float64
		Price      float64
	}
	var lines []lineItem
	for _, item := range req.Items {
		var p struct {
			Brand      string  `db:"brand"`
			SeriesName string  `db:"series_name"`
			Size       string  `db:"size"`
			Finish     *string `db:"finish"`
		}
		if err := h.DB.Get(&p, `SELECT brand, series_name, size, finish FROM products WHERE id=$1 AND org_id=$2`, item.ProductID, orgID); err != nil {
			continue
		}
		finish := ""
		if p.Finish != nil {
			finish = *p.Finish
		}
		lines = append(lines, lineItem{
			Brand: p.Brand, SeriesName: p.SeriesName,
			Size: p.Size, Finish: finish,
			Boxes: item.Boxes, Price: item.PricePerBox,
		})
	}

	poNumber := fmt.Sprintf("PO-%s", time.Now().Format("20060102-150405"))

	pdf := newPDF()
	pdf.AddPage()
	drawHeader(pdf, orgName)

	// PO info box
	pdf.SetFillColor(247, 248, 246)
	pdf.SetDrawColor(220, 223, 217)
	y := pdf.GetY()
	pdf.RoundedRect(15, y, 180, 22, 2, "1234", "FD")

	pdf.SetXY(19, y+4)
	pdf.SetFont("Arial", "B", 8)
	pdf.SetTextColor(82, 96, 91)
	pdf.CellFormat(22, 5, "PO Number:", "", 0, "L", false, 0, "")
	pdf.SetFont("Arial", "", 8)
	pdf.SetTextColor(30, 36, 34)
	pdf.CellFormat(60, 5, poNumber, "", 0, "L", false, 0, "")
	pdf.SetFont("Arial", "B", 8)
	pdf.SetTextColor(82, 96, 91)
	pdf.CellFormat(15, 5, "Date:", "", 0, "L", false, 0, "")
	pdf.SetFont("Arial", "", 8)
	pdf.SetTextColor(30, 36, 34)
	pdf.CellFormat(0, 5, time.Now().Format("02/01/2006"), "", 1, "L", false, 0, "")

	if supplierName != "" {
		pdf.SetXY(19, y+12)
		pdf.SetFont("Arial", "B", 8)
		pdf.SetTextColor(82, 96, 91)
		pdf.CellFormat(22, 5, "Supplier:", "", 0, "L", false, 0, "")
		pdf.SetFont("Arial", "", 8)
		pdf.SetTextColor(30, 36, 34)
		label := supplierName
		if supplierPhone != "" {
			label += " · " + supplierPhone
		}
		pdf.CellFormat(0, 5, label, "", 1, "L", false, 0, "")
	}

	pdf.SetXY(15, y+26)
	pdf.Ln(2)

	// Items table
	pdf.SetFillColor(31, 111, 107)
	pdf.SetTextColor(255, 255, 255)
	pdf.SetFont("Arial", "B", 8)
	pdf.SetDrawColor(255, 255, 255)
	pdf.CellFormat(8, 7, "#", "1", 0, "C", true, 0, "")
	pdf.CellFormat(70, 7, "Product / Design", "1", 0, "L", true, 0, "")
	pdf.CellFormat(28, 7, "Size", "1", 0, "C", true, 0, "")
	pdf.CellFormat(20, 7, "Finish", "1", 0, "C", true, 0, "")
	pdf.CellFormat(18, 7, "Boxes", "1", 0, "R", true, 0, "")
	pdf.CellFormat(22, 7, "Rate", "1", 0, "R", true, 0, "")
	pdf.CellFormat(14, 7, "Amount", "1", 1, "R", true, 0, "")

	var totalBoxes, totalAmount float64
	pdf.SetFont("Arial", "", 8)
	pdf.SetDrawColor(220, 223, 217)

	for i, line := range lines {
		fill := i%2 == 0
		if fill {
			pdf.SetFillColor(247, 248, 246)
		} else {
			pdf.SetFillColor(255, 255, 255)
		}
		pdf.SetTextColor(30, 36, 34)

		amount := line.Boxes * line.Price
		totalBoxes += line.Boxes
		totalAmount += amount

		finish := line.Finish
		if finish == "" {
			finish = "—"
		}
		amountStr := "—"
		rateStr := "—"
		if line.Price > 0 {
			amountStr = fmt.Sprintf("%.0f", amount)
			rateStr = fmt.Sprintf("%.2f", line.Price)
		}

		pdf.CellFormat(8, 6, fmt.Sprintf("%d", i+1), "1", 0, "C", fill, 0, "")
		pdf.CellFormat(70, 6, line.Brand+" "+line.SeriesName, "1", 0, "L", fill, 0, "")
		pdf.CellFormat(28, 6, line.Size, "1", 0, "C", fill, 0, "")
		pdf.CellFormat(20, 6, finish, "1", 0, "C", fill, 0, "")
		pdf.CellFormat(18, 6, fmt.Sprintf("%.0f", line.Boxes), "1", 0, "R", fill, 0, "")
		pdf.CellFormat(22, 6, rateStr, "1", 0, "R", fill, 0, "")
		pdf.CellFormat(14, 6, amountStr, "1", 1, "R", fill, 0, "")
	}

	// Total row
	pdf.SetFillColor(31, 111, 107)
	pdf.SetTextColor(255, 255, 255)
	pdf.SetFont("Arial", "B", 9)
	pdf.CellFormat(126, 8, "TOTAL", "1", 0, "R", true, 0, "")
	pdf.CellFormat(18, 8, fmt.Sprintf("%.0f", totalBoxes), "1", 0, "R", true, 0, "")
	pdf.CellFormat(22, 8, "", "1", 0, "R", true, 0, "")
	if totalAmount > 0 {
		pdf.CellFormat(14, 8, fmt.Sprintf("%.0f", totalAmount), "1", 1, "R", true, 0, "")
	} else {
		pdf.CellFormat(14, 8, "—", "1", 1, "R", true, 0, "")
	}

	if req.Notes != "" {
		pdf.Ln(5)
		pdf.SetFont("Arial", "", 8)
		pdf.SetTextColor(82, 96, 91)
		pdf.CellFormat(0, 5, "Notes: "+req.Notes, "", 1, "L", false, 0, "")
	}

	pdf.Ln(8)
	pdf.SetFont("Arial", "I", 7)
	pdf.SetTextColor(180, 180, 180)
	pdf.CellFormat(0, 5, fmt.Sprintf("Generated on %s · %s", time.Now().Format("02 Jan 2006, 15:04"), orgName), "", 1, "C", false, 0, "")

	c.Header("Content-Type", "application/pdf")
	c.Header("Content-Disposition", fmt.Sprintf(`attachment; filename="%s.pdf"`, poNumber))
	pdf.Output(c.Writer)
}

func (h *PDFHandler) StockReportPDF(c *gin.Context) {
	orgID := c.GetString("org_id")

	var orgName string
	h.DB.Get(&orgName, `SELECT name FROM orgs WHERE id=$1`, orgID)

	var rows []struct {
		Brand        string  `db:"brand"`
		SeriesName   string  `db:"series_name"`
		Size         string  `db:"size"`
		Finish       *string `db:"finish"`
		BoxesInStock float64 `db:"boxes_in_stock"`
		PricePerBox  float64 `db:"price_per_box"`
		StockValue   float64 `db:"stock_value"`
		ReorderLevel int     `db:"reorder_level"`
	}
	h.DB.Select(&rows, `
		SELECT brand, series_name, size, finish, boxes_in_stock, price_per_box, stock_value, reorder_level
		FROM current_stock
		WHERE org_id=$1
		ORDER BY brand, series_name
	`, orgID)

	pdf := newPDF()
	pdf.AddPage()
	drawHeader(pdf, orgName)

	// Report title + date
	pdf.SetFont("Arial", "B", 11)
	pdf.SetTextColor(30, 36, 34)
	pdf.CellFormat(0, 7, "Stock Report", "", 1, "L", false, 0, "")
	pdf.SetFont("Arial", "", 8)
	pdf.SetTextColor(82, 96, 91)
	pdf.CellFormat(0, 5, "As of "+time.Now().Format("02 January 2006"), "", 1, "L", false, 0, "")
	pdf.Ln(3)

	// Table header
	pdf.SetFillColor(31, 111, 107)
	pdf.SetTextColor(255, 255, 255)
	pdf.SetFont("Arial", "B", 8)
	pdf.SetDrawColor(255, 255, 255)
	pdf.CellFormat(8, 7, "#", "1", 0, "C", true, 0, "")
	pdf.CellFormat(45, 7, "Brand / Series", "1", 0, "L", true, 0, "")
	pdf.CellFormat(28, 7, "Size", "1", 0, "C", true, 0, "")
	pdf.CellFormat(22, 7, "Finish", "1", 0, "C", true, 0, "")
	pdf.CellFormat(20, 7, "In Stock", "1", 0, "R", true, 0, "")
	pdf.CellFormat(18, 7, "Reorder", "1", 0, "R", true, 0, "")
	pdf.CellFormat(22, 7, "Rate", "1", 0, "R", true, 0, "")
	pdf.CellFormat(17, 7, "Value", "1", 1, "R", true, 0, "")

	var totalBoxes, totalValue float64
	pdf.SetFont("Arial", "", 8)
	pdf.SetDrawColor(220, 223, 217)

	for i, row := range rows {
		if pdf.GetY() > 260 {
			pdf.AddPage()
		}

		low := row.BoxesInStock <= float64(row.ReorderLevel)
		fill := i%2 == 0
		if fill {
			pdf.SetFillColor(247, 248, 246)
		} else {
			pdf.SetFillColor(255, 255, 255)
		}

		if low {
			pdf.SetTextColor(180, 130, 30) // ochre for low stock
		} else {
			pdf.SetTextColor(30, 36, 34)
		}

		finish := "—"
		if row.Finish != nil {
			finish = *row.Finish
		}
		value := ""
		if row.StockValue > 0 {
			value = fmt.Sprintf("%.0f", row.StockValue)
		} else {
			value = "—"
		}
		rate := "—"
		if row.PricePerBox > 0 {
			rate = fmt.Sprintf("%.2f", row.PricePerBox)
		}

		totalBoxes += row.BoxesInStock
		totalValue += row.StockValue

		pdf.CellFormat(8, 6, fmt.Sprintf("%d", i+1), "1", 0, "C", fill, 0, "")
		pdf.CellFormat(45, 6, row.Brand+" "+row.SeriesName, "1", 0, "L", fill, 0, "")
		pdf.CellFormat(28, 6, row.Size, "1", 0, "C", fill, 0, "")
		pdf.CellFormat(22, 6, finish, "1", 0, "C", fill, 0, "")
		pdf.CellFormat(20, 6, fmt.Sprintf("%.0f", row.BoxesInStock), "1", 0, "R", fill, 0, "")
		pdf.CellFormat(18, 6, fmt.Sprintf("%d", row.ReorderLevel), "1", 0, "R", fill, 0, "")
		pdf.CellFormat(22, 6, rate, "1", 0, "R", fill, 0, "")
		pdf.CellFormat(17, 6, value, "1", 1, "R", fill, 0, "")
	}

	// Totals
	pdf.SetFillColor(31, 111, 107)
	pdf.SetTextColor(255, 255, 255)
	pdf.SetFont("Arial", "B", 8)
	pdf.CellFormat(123, 7, "TOTAL", "1", 0, "R", true, 0, "")
	pdf.CellFormat(20, 7, fmt.Sprintf("%.0f", totalBoxes), "1", 0, "R", true, 0, "")
	pdf.CellFormat(18, 7, "", "1", 0, "R", true, 0, "")
	pdf.CellFormat(22, 7, "", "1", 0, "R", true, 0, "")
	if totalValue > 0 {
		pdf.CellFormat(17, 7, fmt.Sprintf("%.0f", totalValue), "1", 1, "R", true, 0, "")
	} else {
		pdf.CellFormat(17, 7, "—", "1", 1, "R", true, 0, "")
	}

	// Low stock note
	pdf.Ln(5)
	pdf.SetFont("Arial", "", 7)
	pdf.SetTextColor(180, 130, 30)
	pdf.CellFormat(0, 5, "* Highlighted rows are at or below reorder level.", "", 1, "L", false, 0, "")
	pdf.SetTextColor(180, 180, 180)
	pdf.CellFormat(0, 5, fmt.Sprintf("Generated on %s · %s", time.Now().Format("02 Jan 2006, 15:04"), orgName), "", 1, "C", false, 0, "")

	c.Header("Content-Type", "application/pdf")
	c.Header("Content-Disposition", fmt.Sprintf(`attachment; filename="stock-report-%s.pdf"`, time.Now().Format("2006-01-02")))
	pdf.Output(c.Writer)
}
