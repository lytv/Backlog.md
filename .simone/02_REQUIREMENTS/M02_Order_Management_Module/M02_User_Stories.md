# M02: User Stories and Acceptance Criteria

## Epic: Order Management Module

### Story 1: View Customer List
**ID**: M02-US-001
**As a** manager
**I want to** view all customers in the system
**So that** I can manage customer relationships effectively

**Acceptance Criteria**:
- [ ] Customer list displays in paginated table
- [ ] Shows key fields: code, name, type, phone, balance
- [ ] Search works for name, code, phone
- [ ] Filter by customer type (VIP/Regular/New)
- [ ] Filter by active/inactive status
- [ ] Sort by any column
- [ ] Export to Excel/CSV available
- [ ] Load time < 2 seconds

**Test Cases**:
- View list → Shows first 20 customers
- Search "Shinwon" → Filters results
- Filter VIP → Only VIP customers shown
- Sort by name → Alphabetical order
- Export → CSV file downloaded

---

### Story 2: Create New Customer
**ID**: M02-US-002
**As a** manager
**I want to** create new customer profiles
**So that** I can onboard new clients

**Acceptance Criteria**:
- [ ] Form validates all required fields
- [ ] Customer code auto-generated
- [ ] Phone number format validated
- [ ] Email format validated if provided
- [ ] Credit limit defaults to 0
- [ ] Success message on save
- [ ] New customer appears in list
- [ ] Audit log entry created

**Test Cases**:
- Valid data → Customer created
- Missing name → Validation error
- Duplicate phone → Warning shown
- Invalid email → Format error
- Cancel → No changes saved

---

### Story 3: Edit Customer Information
**ID**: M02-US-003
**As a** manager
**I want to** update customer details
**So that** information stays current

**Acceptance Criteria**:
- [ ] Edit form pre-populated
- [ ] Cannot change customer code
- [ ] Validation on save
- [ ] Track changes in audit log
- [ ] Success notification
- [ ] Changes reflected immediately
- [ ] Can upload documents
- [ ] Version history available

**Test Cases**:
- Change address → Updated
- Change credit limit → Logged
- Invalid phone → Error shown
- View history → Shows changes

---

### Story 4: View Customer Order History
**ID**: M02-US-004
**As a** manager
**I want to** see customer's order history
**So that** I can understand their purchasing patterns

**Acceptance Criteria**:
- [ ] Orders tab on customer detail
- [ ] Shows all orders with status
- [ ] Sortable by date, amount
- [ ] Filterable by status
- [ ] Shows order totals
- [ ] Links to order details
- [ ] Summary statistics shown
- [ ] Exportable to Excel

**Test Cases**:
- View history → All orders listed
- Filter completed → Only completed shown
- Click order → Opens detail view
- Export → Excel file created

---

### Story 5: Manage Product Catalog
**ID**: M02-US-005
**As a** manager
**I want to** maintain the product catalog
**So that** we have accurate product information

**Acceptance Criteria**:
- [ ] Product list with search
- [ ] Create new products
- [ ] Edit product details
- [ ] Manage specifications
- [ ] Set fabric composition
- [ ] Both metric and imperial units
- [ ] Product images supported
- [ ] Bulk import capability

**Test Cases**:
- Create product → Success
- Edit specifications → Saved
- Upload image → Displayed
- Import CSV → Products created
- Search by code → Found

---

### Story 6: Define Product-Color Availability
**ID**: M02-US-006
**As a** manager
**I want to** specify which colors are available for each product
**So that** orders can be validated

**Acceptance Criteria**:
- [ ] Color management interface
- [ ] Checkbox grid for product-color
- [ ] Set minimum quantities
- [ ] Bulk update supported
- [ ] Visual color swatches
- [ ] Import/export capability
- [ ] Changes logged
- [ ] Affects order creation

**Test Cases**:
- Enable color → Available in orders
- Disable color → Not selectable
- Set minimum → Enforced in order
- Bulk update → Multiple changed

---

### Story 7: Create Sales Order
**ID**: M02-US-007
**As a** manager
**I want to** create sales orders
**So that** production can begin

**Acceptance Criteria**:
- [ ] Step-by-step wizard
- [ ] Customer selection required
- [ ] Product-color validation
- [ ] One product per order
- [ ] Price auto-populated
- [ ] Quantity conversion shown
- [ ] Delivery date validation
- [ ] Order number generated
- [ ] PDF generation

**Test Cases**:
- Complete wizard → Order created
- Invalid color → Error shown
- Past delivery date → Validation error
- Credit exceeded → Warning shown
- PDF generated → Correct format

---

### Story 8: Calculate Order Pricing
**ID**: M02-US-008
**As a** manager
**I want to** see automatic price calculations
**So that** orders are priced correctly

**Acceptance Criteria**:
- [ ] Base price from price list
- [ ] Quantity discounts applied
- [ ] Customer type affects price
- [ ] Tax calculated
- [ ] Total updates real-time
- [ ] Currency displayed (VND)
- [ ] Discount reasons required
- [ ] Manual override with auth

**Test Cases**:
- Enter quantity → Price calculated
- VIP customer → Discount applied
- Add tax → Total updated
- Manual discount → Reason required

---

### Story 9: Convert Units
**ID**: M02-US-009
**As a** user
**I want to** see quantities in different units
**So that** I can work with familiar measurements

**Acceptance Criteria**:
- [ ] Show kg ↔ lb conversion
- [ ] Show m ↔ yard conversion
- [ ] Maintain precision
- [ ] User preference saved
- [ ] Real-time conversion
- [ ] Tooltip explanations
- [ ] Print shows both units
- [ ] API returns all units

**Test Cases**:
- Enter 100 kg → Shows lb
- Enter 50 yards → Shows meters
- Change preference → Persisted
- Export → Both units included

---

### Story 10: Update Order Status
**ID**: M02-US-010
**As a** manager
**I want to** update order status
**So that** everyone knows current state

**Acceptance Criteria**:
- [ ] Status dropdown on order
- [ ] Valid transitions only
- [ ] Reason for cancellation
- [ ] Email notifications sent
- [ ] Status history tracked
- [ ] Timestamp recorded
- [ ] Cannot edit if in production
- [ ] Audit trail maintained

**Test Cases**:
- Draft → Confirmed → Success
- Confirmed → Draft → Blocked
- Cancel order → Reason required
- View history → All changes shown

---

### Story 11: Search and Filter Orders
**ID**: M02-US-011
**As a** user
**I want to** search and filter orders
**So that** I can find specific orders quickly

**Acceptance Criteria**:
- [ ] Search by order number
- [ ] Filter by customer
- [ ] Filter by status
- [ ] Date range picker
- [ ] Filter by product
- [ ] Save filter sets
- [ ] Quick filters (Today, This Week)
- [ ] Results update instantly

**Test Cases**:
- Search "ORD-2024" → Matching orders
- Filter today → Today's orders only
- Multiple filters → AND condition
- Save filter → Reusable

---

### Story 12: Manage Pricing
**ID**: M02-US-012
**As a** manager
**I want to** manage product pricing
**So that** prices stay competitive

**Acceptance Criteria**:
- [ ] Price list creation
- [ ] Effective date ranges
- [ ] Price by customer type
- [ ] Bulk price updates
- [ ] Price history tracked
- [ ] Approval workflow
- [ ] Import from Excel
- [ ] Preview before save

**Test Cases**:
- Create price list → Active on date
- Update price → History saved
- Import Excel → Validated
- Overlap dates → Warning shown

---

### Story 13: Handle Order Errors
**ID**: M02-US-013
**As a** user
**I want to** see clear error messages
**So that** I can fix issues quickly

**Acceptance Criteria**:
- [ ] Validation before save
- [ ] Clear error messages
- [ ] Field-level errors
- [ ] How-to-fix guidance
- [ ] No data loss on error
- [ ] Retry capability
- [ ] Error logging
- [ ] Support contact shown

**Test Cases**:
- Missing field → Highlighted
- Network error → Retry button
- Validation fail → Specific message
- Fix error → Can save

---

### Story 14: Print Order Documents
**ID**: M02-US-014
**As a** manager
**I want to** print order confirmations
**So that** customers have documentation

**Acceptance Criteria**:
- [ ] Generate PDF format
- [ ] Include all order details
- [ ] Company letterhead
- [ ] Terms and conditions
- [ ] Bilingual (VI/EN)
- [ ] QR code for tracking
- [ ] Email directly
- [ ] Print preview

**Test Cases**:
- Print order → PDF generated
- Email PDF → Sent successfully
- QR code → Links to order
- Language toggle → Changes text

---

### Story 15: View Order Analytics
**ID**: M02-US-015
**As a** manager
**I want to** see order analytics
**So that** I can make informed decisions

**Acceptance Criteria**:
- [ ] Dashboard widgets
- [ ] Orders by status chart
- [ ] Revenue trends graph
- [ ] Top customers list
- [ ] Top products list
- [ ] Date range selector
- [ ] Drill-down capability
- [ ] Export to Excel

**Test Cases**:
- View dashboard → Charts load
- Change dates → Data updates
- Click chart → Details shown
- Export data → Excel created

---

### Story 16: Customer Credit Management
**ID**: M02-US-016
**As a** manager
**I want to** manage customer credit limits
**So that** financial risk is controlled

**Acceptance Criteria**:
- [ ] Set credit limits
- [ ] Track current balance
- [ ] Warning on exceeded limit
- [ ] Block orders if over limit
- [ ] Override with approval
- [ ] Payment recording
- [ ] Aging report
- [ ] Email alerts

**Test Cases**:
- Set limit → Enforced
- Exceed limit → Warning shown
- Record payment → Balance updated
- View aging → Overdue shown

---

### Story 17: Bulk Order Import
**ID**: M02-US-017
**As a** manager
**I want to** import multiple orders
**So that** large customers are handled efficiently

**Acceptance Criteria**:
- [ ] Excel template download
- [ ] CSV/Excel upload
- [ ] Validation preview
- [ ] Error highlighting
- [ ] Partial import blocked
- [ ] Success summary
- [ ] Rollback capability
- [ ] Import history

**Test Cases**:
- Upload file → Validated
- Invalid data → Errors shown
- Fix and retry → Success
- View history → Imports listed

---

### Story 18: Mobile Order View
**ID**: M02-US-018
**As a** mobile user
**I want to** view orders on my phone
**So that** I can check status anywhere

**Acceptance Criteria**:
- [ ] Responsive design
- [ ] Touch-friendly buttons
- [ ] Simplified layout
- [ ] Key info visible
- [ ] Search functional
- [ ] Status updates work
- [ ] Offline message
- [ ] Fast loading

**Test Cases**:
- Open on phone → Displays well
- Search order → Works
- Update status → Saves
- Rotate screen → Adjusts

---

### Story 19: Order Notifications
**ID**: M02-US-019
**As a** user
**I want to** receive order notifications
**So that** I'm informed of important changes

**Acceptance Criteria**:
- [ ] Email on order creation
- [ ] Email on status change
- [ ] In-app notifications
- [ ] Notification preferences
- [ ] Unsubscribe option
- [ ] Batch notifications
- [ ] Mobile push (future)
- [ ] Read/unread status

**Test Cases**:
- Create order → Email sent
- Change status → Notified
- Set preferences → Respected
- Mark read → Status updated

---

### Story 20: Archive Old Orders
**ID**: M02-US-020
**As a** system admin
**I want to** archive old orders
**So that** system performance is maintained

**Acceptance Criteria**:
- [ ] Auto-archive after 2 years
- [ ] Manual archive option
- [ ] Archived orders searchable
- [ ] Restore capability
- [ ] Archive log maintained
- [ ] Performance improved
- [ ] Storage tracked
- [ ] Compliance maintained

**Test Cases**:
- Auto-archive runs → Old orders moved
- Search archived → Found
- Restore order → Available again
- Check performance → Improved

## Definition of Done
- [ ] Code reviewed and approved
- [ ] Unit tests written (>80% coverage)
- [ ] Integration tests passing
- [ ] API documentation updated
- [ ] User documentation created
- [ ] Performance benchmarks met
- [ ] Security scan passed
- [ ] Deployed to staging
- [ ] UAT sign-off received
