/**
 * Type definitions for the contextual help system.
 * Each maintenance screen exports a ScreenHelp object that powers
 * the HelpDrawer (page-level) and InfoTooltip (field-level) content.
 */

export interface PageHelp {
  /** Screen title shown in the help drawer header */
  title: string;
  /** 1-3 sentence description of what this screen does and why it matters */
  description: string;
  /** Things the user should configure before using this screen */
  prerequisites?: string[];
  /** Step-by-step usage guide for the screen */
  steps?: string[];
  /** Practical tips, best practices, and non-obvious behaviour */
  tips?: string[];
}

export interface ScreenHelp {
  /** Page-level help shown in the HelpDrawer */
  page: PageHelp;
  /** Field-level tooltip text keyed by field name — only for non-obvious fields */
  fields?: Record<string, string>;
}
