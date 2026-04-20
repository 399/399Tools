# Design Rules & Standards

## 1. Global Bottom Sheet Component
To ensure a consistent "App-like" experience across the application, all bottom sheet interactions (e.g., Place Details, Navigation Menus, Settings) must adhere to the following standards.

### 1.1 Visual Style
-   **Glassmorphism**: logic should use `bg-[#ffffff85]` with `backdrop-blur-md`.
-   **Borders**: Top border `border-t border-white/50` (or `white/60`) to create a subtle highlight.
-   **Shadows**: Deep but soft shadows (`shadow-2xl` or `shadow-soft-1`).
-   **Rounded Corners**:
    -   **Expanded**: `rounded-t-2xl` (top corners only).
    -   **Collapsed/Floating**: `rounded-2xl` (all corners) or `rounded-card-lg`.

### 1.2 Interaction & Animation
-   **Gestures**:
    -   **Drag to Expand**: Dragging up from the collapsed state should smoothly expand to full screen (`95vh`).
    -   **Drag to Dismiss**: Dragging down from the expanded state should collapse or dismiss.
    -   **Handle Bar**: A visible "pill" handle (`w-10 h-1 bg-gray-400/50 rounded-full`) must be present at the top center for affordance.
-   **Transitions**:
    -   All height/position changes must use a spring-like physics curve or `cubic-bezier(0.32, 0.72, 0, 1)`.
    -   Duration: ~500ms for major state changes.
-   **States**:
    -   **Collapsed (Peek)**: Shows minimal info (e.g., Title + Tags). Height ~200px or content-based.
    -   **Expanded (Full)**: Covers `95vh`. Shows scrollable content. Background dimming (`bg-black/20`) optional but recommended for focus.

### 1.3 Component Structure (Recommended)
Refactor specific implementations (like `PlaceSheet`) to use a shared `BottomSheet` container that handles:
1.  Drag event listeners (`touchstart`, `touchmove`, `touchend`).
2.  State management (`isExpanded`).
3.  Animation interpolation.

## 2. Development Process

### 2.1 Pre-Commit Check
Before submitting any code to GitHub, the following **must** be executed locally to ensure stability:
1.  **Build Check**: Run `pnpm build` to verify that the project builds successfully.
2.  **Lint Check**: Run `pnpm lint` to catch static analysis errors.
3.  **Self-Review**: Briefly review `git status` and changed files to ensure no accidental files are included.
