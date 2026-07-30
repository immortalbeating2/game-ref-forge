// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReferenceToolbar } from "../app/workspace/reference-toolbar";
import { uiCopy } from "../lib/localization";

afterEach(cleanup);

function makeProps() {
  return {
    copy: uiCopy("en"),
    density: "compact" as const,
    resultCount: 12,
    query: "",
    sortMode: "updated_desc" as const,
    sortOptions: [
      { value: "updated_desc" as const, label: "Recently updated" },
      { value: "title_asc" as const, label: "Title" },
    ],
    comparisonDisabled: false,
    comparisonActive: false,
    addDisabled: false,
    dataManagementDisabled: false,
    onQueryChange: vi.fn(),
    onSortChange: vi.fn(),
    onDensityChange: vi.fn(),
    onOpenDataManagement: vi.fn(),
    onStartComparison: vi.fn(),
    onToggleAdd: vi.fn(),
  };
}

describe("ReferenceToolbar", () => {
  it("renders the ordered work controls and exposes its search input", () => {
    const searchInputRef = createRef<HTMLInputElement>();

    render(
      <ReferenceToolbar
        {...makeProps()}
        searchInputRef={searchInputRef}
      />,
    );

    expect(screen.getByRole("searchbox", { name: "Search" })).toBe(
      searchInputRef.current,
    );
    expect(screen.getByRole("combobox", { name: "Sort by" })).toBeTruthy();
    expect(screen.getByRole("radiogroup", { name: "Reference card density" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Start comparison" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "+ Add reference" })).toBeTruthy();
  });

  it("changes density and forwards toolbar actions", async () => {
    const user = userEvent.setup();
    const props = makeProps();

    render(<ReferenceToolbar {...props} />);

    await user.click(screen.getByRole("radio", { name: "Comfortable" }));
    await user.click(screen.getByRole("button", { name: "Start comparison" }));
    await user.click(screen.getByRole("button", { name: "+ Add reference" }));

    expect(props.onDensityChange).toHaveBeenCalledWith("comfortable");
    expect(props.onStartComparison).toHaveBeenCalledTimes(1);
    expect(props.onToggleAdd).toHaveBeenCalledTimes(1);
  });
});
