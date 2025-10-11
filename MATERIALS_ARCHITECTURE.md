# Materials System Architecture

## Database Schema

```
┌─────────────────────────────────────┐
│          MATERIALS TABLE            │
│  (Admin-managed materials list)     │
├─────────────────────────────────────┤
│ id              UUID (PK)           │
│ name            TEXT (unique)       │
│ unit            TEXT                │
│ description     TEXT                │
│ status          active/inactive     │
│ created_at      TIMESTAMP           │
│ created_by      UUID → users        │
└─────────────────────────────────────┘
                  │
                  │ 1:N
                  │
                  ▼
┌─────────────────────────────────────┐
│      SESSION_MATERIALS TABLE        │
│   (Links materials to sessions)     │
├─────────────────────────────────────┤
│ id              UUID (PK)           │
│ session_id      UUID → work_sessions│
│ material_id     UUID → materials    │
│ quantity        DECIMAL             │
│ notes           TEXT                │
│ created_at      TIMESTAMP           │
│ created_by      UUID → users        │
└─────────────────────────────────────┘
```

## User Flow Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                         ADMIN FLOW                            │
└──────────────────────────────────────────────────────────────┘

    [Admin Login]
         │
         ▼
    [Materials Tab]
         │
         ├─────► [Add Material] ──► [Fill Form] ──► [Save to DB]
         │           │
         │           └─► Name, Unit, Description, Status
         │
         ├─────► [Edit Material] ──► [Update Form] ──► [Save Changes]
         │
         └─────► [Delete Material] ──► [Confirm] ──► [Remove from DB]


┌──────────────────────────────────────────────────────────────┐
│                       EMPLOYEE FLOW                           │
└──────────────────────────────────────────────────────────────┘

    [Employee Login]
         │
         ▼
    [Clock In/Out] ──► [Session Created (Draft)]
         │
         ▼
    [Go to My Hours Tab]
         │
         ▼
    [Find Session] ──► [Click 📦 Materials Button]
         │
         ▼
    [Materials Modal Opens]
         │
         ├─► [Select Material from Dropdown]
         │
         ├─► [Enter Quantity (e.g., 1500)]
         │
         ├─► [Add Notes (optional)]
         │
         ▼
    [Click "Add Material to Session"]
         │
         ▼
    [Material Added to List]
         │
         ├─── Can add more materials
         │
         └─► [Click Done]
         │
         ▼
    [Submit Timesheet] ──► [Materials Locked]
```

## Component Architecture

```
App.tsx
│
├─── Materials Tab (Admin Only)
│    │
│    ├─── Materials Header
│    │    └─── [+ Add Material] Button
│    │
│    ├─── Active Materials List
│    │    └─── Material Cards
│    │         ├─── Edit Button → Edit Modal
│    │         └─── Delete Button → Confirm & Delete
│    │
│    ├─── Inactive Materials List
│    │    └─── Material Cards (Read-only)
│    │
│    ├─── Add Material Modal
│    │    ├─── Name Input
│    │    ├─── Unit Dropdown
│    │    ├─── Description Textarea
│    │    └─── Status Toggle
│    │
│    └─── Edit Material Modal
│         └─── Same as Add Modal (pre-filled)
│
└─── My Hours Tab (Employees)
     │
     ├─── Weekly Breakdown
     │    └─── Day Cards
     │         └─── Session Cards
     │              ├─── [📦 Materials] Button (draft only)
     │              ├─── [Edit] Button
     │              └─── [Delete] Button
     │
     └─── Session Materials Modal
          │
          ├─── Session Info Box
          │    ├─── Project
          │    ├─── Role  
          │    └─── Date
          │
          ├─── Added Materials List
          │    └─── Material Items
          │         ├─── Name + Quantity + Unit
          │         ├─── Notes
          │         └─── [Remove] Button
          │
          └─── Add Material Form
               ├─── Material Dropdown
               ├─── Quantity Input
               ├─── Notes Input
               └─── [+ Add Material] Button
```

## State Management

```
App Component State
│
├─── Materials Management
│    ├─── materials[]              (all materials)
│    ├─── showAddMaterial          (show add modal)
│    ├─── newMaterial{}            (form data)
│    ├─── editingMaterial{}        (current edit)
│    └─── showEditMaterial         (show edit modal)
│
└─── Session Materials
     ├─── showAddSessionMaterial     (show modal)
     ├─── selectedSessionForMaterials (current session)
     ├─── sessionMaterials[]         (materials for session)
     └─── newSessionMaterial{}       (form data)
```

## Function Call Flow

```
ADMIN ADDS MATERIAL:
  User clicks "Add Material"
    ↓
  setShowAddMaterial(true)
    ↓
  Modal appears with form
    ↓
  User fills: name, unit, description, status
    ↓
  User clicks "Add Material"
    ↓
  addNewMaterial()
    ↓
  supabase.from('materials').insert()
    ↓
  Database saves material
    ↓
  setMaterials([...materials, newMaterial])
    ↓
  Modal closes, material appears in list


EMPLOYEE ADDS MATERIAL TO SESSION:
  User clicks "Materials" button on session
    ↓
  setSelectedSessionForMaterials(session)
    ↓
  loadSessionMaterials(session.id)
    ↓
  supabase.from('session_materials').select()
    ↓
  setShowAddSessionMaterial(true)
    ↓
  Modal opens with existing materials
    ↓
  User selects material, enters quantity, notes
    ↓
  User clicks "Add Material to Session"
    ↓
  addSessionMaterial()
    ↓
  supabase.from('session_materials').insert()
    ↓
  Database saves session material
    ↓
  setSessionMaterials([...sessionMaterials, new])
    ↓
  Material appears in list in modal
```

## Row Level Security (RLS) Flow

```
MATERIALS TABLE:
  ┌─────────────┐
  │   Request   │
  └──────┬──────┘
         │
         ▼
  ┌──────────────┐
  │  Check Role  │
  └──────┬───────┘
         │
         ├─── Admin? ──► Full Access (CRUD)
         │
         └─── User? ──► Read Only (active materials)


SESSION_MATERIALS TABLE:
  ┌─────────────┐
  │   Request   │
  └──────┬──────┘
         │
         ▼
  ┌──────────────┐
  │  Check Role  │
  └──────┬───────┘
         │
         ├─── Admin? ──► Full Access to all
         │
         └─── User?
               │
               ├─── SELECT: Own sessions only
               │
               ├─── INSERT: Own sessions only
               │
               ├─── UPDATE: Own draft sessions only
               │
               └─── DELETE: Own draft sessions only
```

## Data Relationships

```
      ┌──────────┐
      │   USER   │
      └─────┬────┘
            │
            │ creates
            │
            ▼
      ┌─────────────┐
      │ WORK_SESSION│
      └─────┬───────┘
            │
            │ 1:N
            │
            ▼
   ┌─────────────────┐
   │SESSION_MATERIALS│ ◄─── N:1 ─── MATERIALS
   └─────────────────┘              (created by admin)

   Example:
   Session #123 (John, North Ridge, 8am-5pm)
     │
     ├─► Single Net Straw: 1500 SY
     ├─► Seed Mix: 50 LBS  
     └─► Fertilizer: 25 LBS
```

## Mobile Responsive Breakpoints

```
DESKTOP (> 768px):
  ┌─────────────────────────────────┐
  │  Materials Header               │
  │  [Title]           [+ Add]      │
  ├─────────────────────────────────┤
  │  ┌───────┐  ┌───────┐  ┌───────┐│
  │  │ Card  │  │ Card  │  │ Card  ││
  │  │       │  │       │  │       ││
  │  └───────┘  └───────┘  └───────┘│
  └─────────────────────────────────┘


MOBILE (< 768px):
  ┌─────────────────┐
  │ Materials Header│
  │    [Title]      │
  │  [+ Add Button] │
  ├─────────────────┤
  │  ┌───────────┐  │
  │  │   Card    │  │
  │  │           │  │
  │  └───────────┘  │
  │  ┌───────────┐  │
  │  │   Card    │  │
  │  │           │  │
  │  └───────────┘  │
  └─────────────────┘
```

## Error Handling

```
TRY ADD MATERIAL:
  addNewMaterial()
    ↓
  Validate inputs
    ↓
  ┌─── Name empty? ──► showToast('error')
  │
  ├─── Unit empty? ──► showToast('error')
  │
  └─── Valid ──► supabase.insert()
         │
         ├─── Success ──► showToast('success')
         │
         └─── Error (duplicate name)
                  ↓
              showToast('Failed to add material')


TRY ADD SESSION MATERIAL:
  addSessionMaterial()
    ↓
  Validate inputs
    ↓
  ┌─── No material? ──► showToast('error')
  │
  ├─── No quantity? ──► showToast('error')
  │
  └─── Valid ──► supabase.insert()
         │
         ├─── Success ──► showToast('success')
         │
         └─── Error (23505 = duplicate)
                  ↓
              showToast('Already added')
```

---

This system provides a complete materials tracking solution with proper separation of concerns between admin management and employee usage!
