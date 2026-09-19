package handlers

import (
	"reflect"
	"testing"
)

func TestOrgFieldFormats(t *testing.T) {
	for s, want := range map[string]bool{
		"29ABCDE1234F1Z5": true, "27AAPFU0939F1ZV": true,
		"29ABCDE1234F1X5": false, "29abcde1234f1z5": false, "123": false,
	} {
		if got := gstinRe.MatchString(s); got != want {
			t.Errorf("gstin %q: got %v want %v", s, got, want)
		}
	}
	for s, want := range map[string]bool{"560001": true, "060001": false, "56000": false} {
		if got := pincodeRe.MatchString(s); got != want {
			t.Errorf("pincode %q: got %v want %v", s, got, want)
		}
	}
	for s, want := range map[string]bool{"9876543210": true, "+91 98765 43210": true, "12345": false} {
		if got := phoneRe.MatchString(s); got != want {
			t.Errorf("phone %q: got %v want %v", s, got, want)
		}
	}
}

func TestOrgHeaderLines(t *testing.T) {
	s := func(v string) *string { return &v }
	full := OrgProfile{Name: "Balaji Tiles", LegalName: s("Balaji Ceramics Pvt Ltd"),
		Address: s("12 MG Road"), City: s("Bengaluru"), State: s("Karnataka"), Pincode: s("560001"),
		Phone: s("9876543210"), GSTIN: s("29ABCDE1234F1Z5")}
	want := []string{"Balaji Ceramics Pvt Ltd", "12 MG Road, Bengaluru, Karnataka - 560001",
		"Ph: 9876543210  |  GSTIN: 29ABCDE1234F1Z5"}
	if got := orgHeaderLines(full); !reflect.DeepEqual(got, want) {
		t.Errorf("full: got %q", got)
	}
	if got := orgHeaderLines(OrgProfile{Name: "Only Name"}); len(got) != 0 {
		t.Errorf("name only: got %q", got)
	}
}
