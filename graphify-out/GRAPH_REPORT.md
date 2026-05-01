# Graph Report - /Users/chetan/Documents/Avyren-Technologies/Products/Mobile-ERP/mobile-app  (2026-05-01)

## Corpus Check
- 591 files · ~0 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2455 nodes · 2046 edges · 41 communities detected
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 113 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Admin & Location Management|Admin & Location Management]]
- [[_COMMUNITY_Auth & MFA Screens|Auth & MFA Screens]]
- [[_COMMUNITY_Company Admin Queries|Company Admin Queries]]
- [[_COMMUNITY_Employee Dashboard|Employee Dashboard]]
- [[_COMMUNITY_Auth Store & Layout|Auth Store & Layout]]
- [[_COMMUNITY_Analytics Charts|Analytics Charts]]
- [[_COMMUNITY_User Management Screen|User Management Screen]]
- [[_COMMUNITY_Tenant Onboarding Wizard|Tenant Onboarding Wizard]]
- [[_COMMUNITY_Attendance Admin Screen|Attendance Admin Screen]]
- [[_COMMUNITY_HR Core Queries|HR Core Queries]]
- [[_COMMUNITY_UI Utils & Visitor Screens|UI Utils & Visitor Screens]]
- [[_COMMUNITY_Company Profile Screen|Company Profile Screen]]
- [[_COMMUNITY_Shift Check-In Screen|Shift Check-In Screen]]
- [[_COMMUNITY_CLI Project Setup|CLI Project Setup]]
- [[_COMMUNITY_Role Management Screen|Role Management Screen]]
- [[_COMMUNITY_Loan & Expenses Screens|Loan & Expenses Screens]]
- [[_COMMUNITY_Approval Workflow Screen|Approval Workflow Screen]]
- [[_COMMUNITY_Subscription Detail Screen|Subscription Detail Screen]]
- [[_COMMUNITY_Cost Centre Screen|Cost Centre Screen]]
- [[_COMMUNITY_Payroll Run Screen|Payroll Run Screen]]
- [[_COMMUNITY_Payment History Screen|Payment History Screen]]
- [[_COMMUNITY_Visitor Type Screen|Visitor Type Screen]]
- [[_COMMUNITY_Recurring Passes Screen|Recurring Passes Screen]]
- [[_COMMUNITY_Hr Grade Screen|Hr Grade Screen]]
- [[_COMMUNITY_Hr Designation Screen|Hr Designation Screen]]
- [[_COMMUNITY_Hr Department Screen|Hr Department Screen]]
- [[_COMMUNITY_Hr Roster Screen|Hr Roster Screen]]
- [[_COMMUNITY_Components Language Item|Components Language Item]]
- [[_COMMUNITY_Src Features Company Admin Visitors Vehi|Src Features Company Admin Visitors Vehi]]
- [[_COMMUNITY_Src Features Company Admin Visitors Grou|Src Features Company Admin Visitors Grou]]
- [[_COMMUNITY_Hr Notification Template Screen|Hr Notification Template Screen]]
- [[_COMMUNITY_Hr Appraisal Cycles Screen|Hr Appraisal Cycles Screen]]
- [[_COMMUNITY_Hr Notification Rule Screen|Hr Notification Rule Screen]]
- [[_COMMUNITY_Hr Loan Screen|Hr Loan Screen]]
- [[_COMMUNITY_Src Features Super Admin Tenant Onboardi|Src Features Super Admin Tenant Onboardi]]
- [[_COMMUNITY_Src Features Company Admin Visitors Gate|Src Features Company Admin Visitors Gate]]
- [[_COMMUNITY_Src Features Company Admin Visitors Mate|Src Features Company Admin Visitors Mate]]
- [[_COMMUNITY_Lib Offline Punch Queue|Lib Offline Punch Queue]]
- [[_COMMUNITY_Api Utils|Api Utils]]
- [[_COMMUNITY_Src Features Company Admin Visitors Watc|Src Features Company Admin Visitors Watc]]
- [[_COMMUNITY_Lib Test Utils|Lib Test Utils]]

## God Nodes (most connected - your core abstractions)
1. `String()` - 28 edges
2. `showErrorMessage()` - 25 edges
3. `showSuccess()` - 9 edges
4. `useIsDark()` - 9 edges
5. `handleToggleBiometric()` - 6 edges
6. `handleSubmit()` - 6 edges
7. `validateCurrentStep()` - 6 edges
8. `getItem()` - 6 edges
9. `setupProject()` - 5 edges
10. `AppSidebar()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `handleMfaSetup()` --calls--> `showErrorMessage()`  [INFERRED]
  src/features/settings/settings-screen.tsx → src/components/ui/utils.tsx
- `handleSubmit()` --calls--> `decodeJwtPayload()`  [INFERRED]
  src/features/auth/mfa-setup-screen.tsx → src/lib/api/auth.ts
- `handleSubmit()` --calls--> `signIn()`  [INFERRED]
  src/features/auth/mfa-setup-screen.tsx → src/features/auth/use-auth-store.ts
- `asDisplayText()` --calls--> `String()`  [INFERRED]
  src/features/company-admin/hr/my-profile-screen.tsx → src/features/company-admin/hr/holiday-screen.tsx
- `humanizeEnum()` --calls--> `String()`  [INFERRED]
  src/features/company-admin/hr/my-profile-screen.tsx → src/features/company-admin/hr/holiday-screen.tsx

## Communities

### Community 0 - "Admin & Location Management"
Cohesion: 0.02
Nodes (30): formatAxisValue(), handleEditGeofence(), getPreview(), handleSave(), toOptionalInt(), formatDuration(), formatMaxOneDecimal(), String() (+22 more)

### Community 1 - "Auth & MFA Screens"
Cohesion: 0.02
Nodes (36): fetchSetup(), handleChange(), handleCopySecret(), handleSubmit(), handleChange(), handleCopySecret(), handleSubmit(), handleChange() (+28 more)

### Community 3 - "Company Admin Queries"
Cohesion: 0.03
Nodes (17): formatDate(), checkPermission(), decodeJwtPayload(), useCompanySettings(), useNavigationManifest(), AppSidebar(), BiometricPromptModal(), createBiometricStyles() (+9 more)

### Community 5 - "Employee Dashboard"
Cohesion: 0.05
Nodes (2): daysUntil(), isThisWeek()

### Community 7 - "Auth Store & Layout"
Cohesion: 0.07
Nodes (19): checkBiometric(), getRoleLabel(), getUserRoleDisplayLabel(), persistAuthUser(), signIn(), getToken(), removeToken(), setToken() (+11 more)

### Community 12 - "Analytics Charts"
Cohesion: 0.06
Nodes (10): FunnelChart(), HeatmapChart(), ScatterChart(), useIsDark(), FormLabel(), DropdownField(), SidebarNavIcon(), handleSave() (+2 more)

### Community 13 - "User Management Screen"
Cohesion: 0.07
Nodes (6): formatLastLogin(), handleSubmit(), validate(), fmtDate(), formatRelativeTime(), getRelativeTime()

### Community 16 - "Tenant Onboarding Wizard"
Cohesion: 0.1
Nodes (5): handleNext(), validateCurrentStep(), getStep2Schema(), validateArrayStep(), validateStep()

### Community 17 - "Attendance Admin Screen"
Cohesion: 0.09
Nodes (1): getTodayDateString()

### Community 19 - "HR Core Queries"
Cohesion: 0.1
Nodes (1): downloadBulkEmployeeTemplate()

### Community 25 - "UI Utils & Visitor Screens"
Cohesion: 0.13
Nodes (9): extractError(), showError(), showWarning(), capturePhoto(), handleSubmit(), validate(), capturePhoto(), handleSubmit() (+1 more)

### Community 26 - "Company Profile Screen"
Cohesion: 0.14
Nodes (6): getAutoDeps(), getLocationBillingType(), handleAddModule(), handleRemoveModule(), handleSave(), validate()

### Community 29 - "Shift Check-In Screen"
Cohesion: 0.13
Nodes (1): fmtDur()

### Community 30 - "CLI Project Setup"
Cohesion: 0.22
Nodes (10): cloneLastTemplateRelease(), getLatestRelease(), initGit(), installDeps(), removeFiles(), setupProject(), updatePackageInfos(), updateProjectConfig() (+2 more)

### Community 31 - "Role Management Screen"
Cohesion: 0.17
Nodes (2): handleSubmit(), validate()

### Community 35 - "Loan & Expenses Screens"
Cohesion: 0.18
Nodes (5): handleApply(), formatCurrency(), handleApprove(), handleApprove(), handlePay()

### Community 38 - "Approval Workflow Screen"
Cohesion: 0.18
Nodes (2): handleToggle(), renderItem()

### Community 42 - "Subscription Detail Screen"
Cohesion: 0.22
Nodes (2): AmcStatusBadge(), amcStatusColor()

### Community 45 - "Cost Centre Screen"
Cohesion: 0.22
Nodes (2): handleSave(), validate()

### Community 46 - "Payroll Run Screen"
Cohesion: 0.22
Nodes (2): formatCurrency(), handleDisburse()

### Community 55 - "Payment History Screen"
Cohesion: 0.29
Nodes (2): handleClose(), resetForm()

### Community 58 - "Visitor Type Screen"
Cohesion: 0.29
Nodes (2): handleSave(), validate()

### Community 59 - "Recurring Passes Screen"
Cohesion: 0.29
Nodes (2): handleSave(), validate()

### Community 63 - "Hr Grade Screen"
Cohesion: 0.29
Nodes (2): handleSave(), validate()

### Community 64 - "Hr Designation Screen"
Cohesion: 0.29
Nodes (2): handleSave(), validate()

### Community 65 - "Hr Department Screen"
Cohesion: 0.29
Nodes (2): handleSave(), validate()

### Community 67 - "Hr Roster Screen"
Cohesion: 0.29
Nodes (2): handleSave(), validate()

### Community 70 - "Components Language Item"
Cohesion: 0.25
Nodes (3): LanguageItem(), useSelectedLanguage(), useModal()

### Community 78 - "Src Features Company Admin Visitors Vehi"
Cohesion: 0.33
Nodes (2): handleSave(), validate()

### Community 79 - "Src Features Company Admin Visitors Grou"
Cohesion: 0.33
Nodes (2): handleSave(), validate()

### Community 83 - "Hr Notification Template Screen"
Cohesion: 0.33
Nodes (2): handleToggle(), renderItem()

### Community 85 - "Hr Appraisal Cycles Screen"
Cohesion: 0.33
Nodes (2): handleLifecycle(), renderItem()

### Community 87 - "Hr Notification Rule Screen"
Cohesion: 0.33
Nodes (2): handleToggle(), renderItem()

### Community 88 - "Hr Loan Screen"
Cohesion: 0.33
Nodes (2): formatCurrency(), handleStatusAction()

### Community 96 - "Src Features Super Admin Tenant Onboardi"
Cohesion: 0.33
Nodes (2): toggleModule(), resolveModuleDependencies()

### Community 101 - "Src Features Company Admin Visitors Gate"
Cohesion: 0.4
Nodes (2): handleSave(), validate()

### Community 102 - "Src Features Company Admin Visitors Mate"
Cohesion: 0.4
Nodes (2): handleSave(), validate()

### Community 116 - "Lib Offline Punch Queue"
Cohesion: 0.67
Nodes (5): enqueuePunch(), getQueue(), getQueueLength(), saveQueue(), syncQueue()

### Community 118 - "Api Utils"
Cohesion: 0.47
Nodes (3): getNextPageParam(), getPreviousPageParam(), getUrlParameters()

### Community 148 - "Src Features Company Admin Visitors Watc"
Cohesion: 0.67
Nodes (2): handleSubmit(), validate()

### Community 162 - "Lib Test Utils"
Cohesion: 0.83
Nodes (3): createAppWrapper(), customRender(), setup()

## Knowledge Gaps
- **Thin community `Employee Dashboard`** (41 nodes): `ArrowIcon()`, `BellIcon()`, `CalendarIcon()`, `CheckIcon()`, `CheckSquareIcon()`, `ChevronLeftIcon()`, `ChevronRightIcon()`, `ClipboardCheckIcon()`, `ClockIcon()`, `CoffeeIcon()`, `daysUntil()`, `EyeIcon()`, `FileTextIcon()`, `formatTimeShort()`, `getBarColor()`, `getDonutColor()`, `getGreeting()`, `goToNextMonth()`, `goToPrevMonth()`, `GraduationCapIcon()`, `InfoIcon()`, `isThisWeek()`, `LandmarkIcon()`, `MapPinIcon()`, `MegaphoneIcon()`, `normalizeDashboardData()`, `parseWorkedHours()`, `SendIcon()`, `TargetIcon()`, `tick()`, `TimerIcon()`, `TrendDownIcon()`, `TrendUpIcon()`, `typeColor()`, `UserCheckIcon()`, `UserCogIcon()`, `UserIcon()`, `UserMinusIcon()`, `UsersIcon()`, `UserXIcon()`, `dashboard-screen.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Attendance Admin Screen`** (22 nodes): `ActivityIcon()`, `BookIcon()`, `CalendarIcon()`, `CheckCircleIcon()`, `CheckSquareIcon()`, `ChevronDownIcon()`, `ClockIcon()`, `deriveBookStatus()`, `getInitials()`, `getTodayDateString()`, `LockIcon()`, `MapPinIcon()`, `SaveIcon()`, `SearchIcon()`, `ShieldIcon()`, `SquareIcon()`, `StatusBadge()`, `useDebounce()`, `UserIcon()`, `UsersIcon()`, `XIcon()`, `admin-attendance-screen.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `HR Core Queries`** (21 nodes): `downloadBulkEmployeeTemplate()`, `useCostCentre()`, `useCostCentres()`, `useDepartment()`, `useDepartments()`, `useDesignation()`, `useDesignations()`, `useEmployee()`, `useEmployeeDocuments()`, `useEmployeeEducation()`, `useEmployeeNominees()`, `useEmployeePrevEmployment()`, `useEmployees()`, `useEmployeeTimeline()`, `useEmployeeType()`, `useEmployeeTypes()`, `useGrade()`, `useGrades()`, `useOrgChart()`, `useProbationDue()`, `use-hr-queries.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Shift Check-In Screen`** (15 nodes): `ActivityIcon()`, `ArrowIcon()`, `BriefIcon()`, `CalendarIcon()`, `CheckIcon()`, `ClockIcon()`, `fmtDur()`, `fmtTime()`, `MapPinIcon()`, `parseWorkedHours()`, `ShieldIcon()`, `StatusBadge()`, `TimerIcon()`, `WarnIcon()`, `shift-check-in-screen.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Role Management Screen`** (13 nodes): `applyTemplate()`, `getModulePermCount()`, `handleAdd()`, `handleDelete()`, `handleEdit()`, `handleSubmit()`, `mapApiRole()`, `mapReferenceRole()`, `toggleAllModulePerms()`, `toggleModule()`, `togglePermission()`, `validate()`, `role-management-screen.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Approval Workflow Screen`** (12 nodes): `addStep()`, `getTriggerColor()`, `handleCreate()`, `handleDelete()`, `handleEdit()`, `handleSave()`, `handleToggle()`, `removeStep()`, `renderHeader()`, `renderItem()`, `updateStep()`, `approval-workflow-screen.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Subscription Detail Screen`** (10 nodes): `subscription-detail-screen.tsx`, `AmcStatusBadge()`, `amcStatusColor()`, `BackButton()`, `BillingTypeBadge()`, `formatCurrency()`, `formatDate()`, `isReactivatable()`, `TierBadge()`, `toStatusBadgeType()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Cost Centre Screen`** (10 nodes): `formatCurrency()`, `generateCode()`, `handleAdd()`, `handleDelete()`, `handleEdit()`, `handleSave()`, `renderHeader()`, `triggerToast()`, `validate()`, `cost-centre-screen.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Payroll Run Screen`** (10 nodes): `formatCurrency()`, `formatDate()`, `handleApprove()`, `handleCompute()`, `handleCreateRun()`, `handleDisburse()`, `handleLock()`, `handleReview()`, `handleStatutory()`, `payroll-run-screen.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Payment History Screen`** (8 nodes): `payment-history-screen.tsx`, `formatCurrency()`, `formatDate()`, `formatMethodLabel()`, `handleClose()`, `handleRecordPayment()`, `handleSubmit()`, `resetForm()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Visitor Type Screen`** (8 nodes): `visitor-type-screen.tsx`, `handleActivate()`, `handleAdd()`, `handleDeactivate()`, `handleDelete()`, `handleEdit()`, `handleSave()`, `validate()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Recurring Passes Screen`** (8 nodes): `recurring-passes-screen.tsx`, `handleCheckIn()`, `handleCreate()`, `handleRevoke()`, `handleSave()`, `handleShareQr()`, `renderItem()`, `validate()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Hr Grade Screen`** (8 nodes): `formatCurrency()`, `handleAdd()`, `handleDelete()`, `handleEdit()`, `handleSave()`, `triggerToast()`, `validate()`, `grade-screen.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Hr Designation Screen`** (8 nodes): `generateCode()`, `handleAdd()`, `handleDelete()`, `handleEdit()`, `handleSave()`, `triggerToast()`, `validate()`, `designation-screen.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Hr Department Screen`** (8 nodes): `generateCode()`, `handleAdd()`, `handleDelete()`, `handleEdit()`, `handleSave()`, `triggerToast()`, `validate()`, `department-screen.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Hr Roster Screen`** (8 nodes): `handleAdd()`, `handleDelete()`, `handleEdit()`, `handleSave()`, `renderHeader()`, `triggerToast()`, `validate()`, `roster-screen.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Src Features Company Admin Visitors Vehi`** (7 nodes): `vehicle-passes-screen.tsx`, `confirmExit()`, `handleCreate()`, `handleRecordExit()`, `handleSave()`, `renderItem()`, `validate()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Src Features Company Admin Visitors Grou`** (7 nodes): `group-visits-screen.tsx`, `handleBatchCheckIn()`, `handleBatchCheckOut()`, `handleCreate()`, `handleSave()`, `renderItem()`, `validate()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Hr Notification Template Screen`** (7 nodes): `handleCreate()`, `handleDelete()`, `handleEdit()`, `handleSave()`, `handleToggle()`, `renderItem()`, `notification-template-screen.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Hr Appraisal Cycles Screen`** (7 nodes): `handleAdd()`, `handleDelete()`, `handleEdit()`, `handleLifecycle()`, `handleSave()`, `renderItem()`, `appraisal-cycles-screen.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Hr Notification Rule Screen`** (7 nodes): `handleCreate()`, `handleDelete()`, `handleEdit()`, `handleSave()`, `handleToggle()`, `renderItem()`, `notification-rule-screen.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Hr Loan Screen`** (7 nodes): `computeEMI()`, `formatCurrency()`, `handleAdd()`, `handleSave()`, `handleStatusAction()`, `toOptions()`, `loan-screen.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Src Features Super Admin Tenant Onboardi`** (6 nodes): `constants.ts`, `step09-per-location-modules.tsx`, `copyToAll()`, `setCustomPrice()`, `toggleModule()`, `resolveModuleDependencies()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Src Features Company Admin Visitors Gate`** (6 nodes): `gate-screen.tsx`, `handleAdd()`, `handleDelete()`, `handleEdit()`, `handleSave()`, `validate()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Src Features Company Admin Visitors Mate`** (6 nodes): `material-passes-screen.tsx`, `handleCreate()`, `handleMarkReturned()`, `handleSave()`, `renderItem()`, `validate()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Src Features Company Admin Visitors Watc`** (4 nodes): `watchlist-screen.tsx`, `handleAdd()`, `handleSubmit()`, `validate()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `String()` connect `Admin & Location Management` to `Auth & MFA Screens`, `Auth Store & Layout`, `Tenant Onboarding Wizard`, `Attendance Admin Screen`, `Company Profile Screen`, `Shift Check-In Screen`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Why does `showErrorMessage()` connect `Auth & MFA Screens` to `Admin & Location Management`, `UI Utils & Visitor Screens`, `Auth Store & Layout`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Why does `registerForPushNotifications()` connect `Auth Store & Layout` to `Admin & Location Management`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **Are the 27 inferred relationships involving `String()` (e.g. with `buildBillingKPIs()` and `formatCount()`) actually correct?**
  _`String()` has 27 INFERRED edges - model-reasoned connections that need verification._
- **Are the 24 inferred relationships involving `showErrorMessage()` (e.g. with `commitQuietStart()` and `commitQuietEnd()`) actually correct?**
  _`showErrorMessage()` has 24 INFERRED edges - model-reasoned connections that need verification._
- **Are the 8 inferred relationships involving `showSuccess()` (e.g. with `handleToggleBiometric()` and `handleSubmit()`) actually correct?**
  _`showSuccess()` has 8 INFERRED edges - model-reasoned connections that need verification._
- **Are the 8 inferred relationships involving `useIsDark()` (e.g. with `BiometricPromptModal()` and `FormLabel()`) actually correct?**
  _`useIsDark()` has 8 INFERRED edges - model-reasoned connections that need verification._