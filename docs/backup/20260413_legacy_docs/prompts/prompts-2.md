# 2025-06-09 13:30

### Codex: Implement Missing Features for Owner Dashboard

Your primary responsibility is to thoroughly review and implement all missing or placeholder features for the **owner's dashboard under the `dashboard` folder and its related codebase**. Follow these instructions precisely:

1. Navigate to the project root, then:

```bash
cd web
npm run build
```

to confirm the project compiles without type errors before beginning.

2. **Review existing code** within the `dashboard` directory. Clearly identify and list all incomplete or missing functionalities based on the requirements in the documentation or existing TODO comments.

3. Check and improve the logic of API endpoints associated with the dashboard features. Evaluate if complex database interactions currently using multiple queries can be optimized by creating SQL functions or stored procedures to enhance performance.

4. Implement the identified missing features methodically, ensuring all state management, authentication, validation, and error handling are robust and adhere to best practices.

5. After each implementation step, regularly run:

```bash
npm run build
```

to ensure no type errors or regressions are introduced.

Deliver a detailed summary of changes, improvements made, and newly created SQL functions or queries optimized.

---

### Jules: Enhance UI/UX for Customer Menu

Your task focuses on reviewing and significantly improving the **User Interface (UI) and User Experience (UX) within the customer-facing `menu` folder and its related codebase**. Follow these specific guidelines:

1. Start by verifying that the existing code compiles cleanly:

```bash
cd web
npm run build
```

2. Carefully examine all user-facing interactions, UI components, and navigation flows in the `menu` directory, clearly noting areas that feel unintuitive, cumbersome, or suboptimal, especially on mobile devices.

3. Evaluate the API endpoint logic related to user interactions in the `menu` views. Optimize these endpoints by creating SQL functions or stored procedures to reduce redundant or multiple database queries and boost performance.

4. Implement UX enhancements, focusing on intuitive interaction patterns, mobile-first responsiveness, readability, visual clarity, and ease of use. Ensure consistency in design elements across different pages and components.

5. Run:

```bash
npm run build
```

frequently throughout the process to validate your changes and confirm no new type or compilation errors are introduced.

Provide a comprehensive summary of the UI/UX improvements made, along with specific details about performance optimization through newly introduced or modified SQL functions or queries.
