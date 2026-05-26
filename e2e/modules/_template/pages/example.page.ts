/**
 * Page Object Model template for Detox.
 *
 * Encapsulates element selectors and actions for a specific screen.
 * Use testIDs from routes.ts.
 *
 * Example:
 *   class EmployeeListPage {
 *     get searchInput() { return element(by.id('hrms-employee-search')); }
 *     get addButton() { return element(by.id('hrms-employee-add-btn')); }
 *
 *     async search(query: string) {
 *       await this.searchInput.clearText();
 *       await this.searchInput.typeText(query);
 *     }
 *
 *     async tapAdd() {
 *       await this.addButton.tap();
 *     }
 *   }
 */
export {};
