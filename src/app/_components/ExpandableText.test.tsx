"use client";

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ExpandableText } from "@/app/_components/ExpandableText";

describe("ExpandableText", () => {
  it("toggles expanded state accessibly", () => {
    render(
      <ExpandableText
        text="one two three four five six seven eight nine ten eleven twelve"
        minWords={5}
      />,
    );

    const button = screen.getByRole("button", { name: "Show more" });
    expect(button).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(button);

    expect(screen.getByRole("button", { name: "Show less" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(/one two three four five six seven eight/i)).toBeInTheDocument();
  });
});
