package handlers

import (
	"net/http"
	"regexp"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
)

type OrgHandler struct{ DB *sqlx.DB }

// OrgProfile is the shop's company details, as shown in the app and on PDFs.
type OrgProfile struct {
	ID            string  `db:"id" json:"id"`
	Name          string  `db:"name" json:"name"`
	LegalName     *string `db:"legal_name" json:"legal_name"`
	GSTIN         *string `db:"gstin" json:"gstin"`
	Phone         *string `db:"phone" json:"phone"`
	Email         *string `db:"email" json:"email"`
	Address       *string `db:"address" json:"address"`
	City          *string `db:"city" json:"city"`
	State         *string `db:"state" json:"state"`
	Pincode       *string `db:"pincode" json:"pincode"`
	SetupComplete bool    `db:"setup_complete" json:"setup_complete"`
}

const orgProfileCols = `id, name, legal_name, gstin, phone, email, address, city, state, pincode,
	setup_completed_at IS NOT NULL AS setup_complete`

func loadOrgProfile(db sqlx.Queryer, orgID string) (OrgProfile, error) {
	var p OrgProfile
	err := sqlx.Get(db, &p, `SELECT `+orgProfileCols+` FROM orgs WHERE id=$1`, orgID)
	return p, err
}

// Get returns the signed-in user's shop.
func (h *OrgHandler) Get(c *gin.Context) {
	p, err := loadOrgProfile(h.DB, c.GetString("org_id"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "shop not found"})
		return
	}
	c.JSON(http.StatusOK, p)
}

type updateOrgReq struct {
	Name      string `json:"name"`
	LegalName string `json:"legal_name"`
	GSTIN     string `json:"gstin"`
	Phone     string `json:"phone"`
	Email     string `json:"email"`
	Address   string `json:"address"`
	City      string `json:"city"`
	State     string `json:"state"`
	Pincode   string `json:"pincode"`
}

var (
	gstinRe   = regexp.MustCompile(`^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$`)
	pincodeRe = regexp.MustCompile(`^[1-9][0-9]{5}$`)
	phoneRe   = regexp.MustCompile(`^\+?[0-9 -]{10,15}$`)
	emailRe   = regexp.MustCompile(`^[^@\s]+@[^@\s]+\.[^@\s]+$`)
)

// Update saves the shop's details and marks setup complete. Owner only.
func (h *OrgHandler) Update(c *gin.Context) {
	var r updateOrgReq
	if err := c.ShouldBindJSON(&r); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	trim := func(s string) string { return strings.TrimSpace(s) }
	r.Name, r.LegalName, r.Phone, r.Email = trim(r.Name), trim(r.LegalName), trim(r.Phone), trim(r.Email)
	r.Address, r.City, r.State, r.Pincode = trim(r.Address), trim(r.City), trim(r.State), trim(r.Pincode)
	r.GSTIN = strings.ToUpper(strings.ReplaceAll(trim(r.GSTIN), " ", ""))

	switch {
	case r.Name == "":
		c.JSON(http.StatusBadRequest, gin.H{"error": "Shop name is required"})
		return
	case r.Phone == "" || !phoneRe.MatchString(r.Phone):
		c.JSON(http.StatusBadRequest, gin.H{"error": "Enter a valid phone number"})
		return
	case r.Address == "" || r.City == "" || r.State == "":
		c.JSON(http.StatusBadRequest, gin.H{"error": "Address, city and state are required"})
		return
	case !pincodeRe.MatchString(r.Pincode):
		c.JSON(http.StatusBadRequest, gin.H{"error": "PIN code must be 6 digits"})
		return
	case r.GSTIN != "" && !gstinRe.MatchString(r.GSTIN):
		c.JSON(http.StatusBadRequest, gin.H{"error": "GSTIN should look like 29ABCDE1234F1Z5"})
		return
	case r.Email != "" && !emailRe.MatchString(r.Email):
		c.JSON(http.StatusBadRequest, gin.H{"error": "Enter a valid business email"})
		return
	}

	nullable := func(s string) interface{} {
		if s == "" {
			return nil
		}
		return s
	}
	orgID := c.GetString("org_id")
	_, err := h.DB.Exec(`
		UPDATE orgs SET name=$2, legal_name=$3, gstin=$4, phone=$5, email=$6,
			address=$7, city=$8, state=$9, pincode=$10,
			setup_completed_at = COALESCE(setup_completed_at, now())
		WHERE id=$1`,
		orgID, r.Name, nullable(r.LegalName), nullable(r.GSTIN), r.Phone, nullable(r.Email),
		r.Address, r.City, r.State, r.Pincode)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save shop details"})
		return
	}
	p, err := loadOrgProfile(h.DB, orgID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load shop details"})
		return
	}
	c.JSON(http.StatusOK, p)
}
