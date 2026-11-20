# Navigation icons

Use the house icon only for links to the main Classroom Tools hub. Use the shared
`exitDoorPath` for leaving an activity or returning to its containing collection,
setup screen, or builder. Preserve the existing destination and exit confirmation.

Render the path in a `0 0 24 24` SVG with no fill, a currentColor stroke, and rounded
line caps and joins. Mark the SVG `aria-hidden="true"`; give its link or button an
accessible label and tooltip naming the destination (for example, "Return to levels").
The outline scales and follows the surrounding control in light and dark themes.
