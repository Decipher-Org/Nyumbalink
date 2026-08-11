import { useLocation, useSearchParams } from "react-router-dom";

import { StubPage } from "./StubPage";

/**
 * Placeholder for search results.
 *
 * `GET /properties` requires a session, so this route is only reached after
 * signup. It echoes the criteria carried through the signup detour to confirm
 * the handoff survived intact.
 */
export default function Browse() {
  const [searchParams] = useSearchParams();
  const { search } = useLocation();
  const hasCriteria = Array.from(searchParams.keys()).length > 0;

  return (
    <StubPage
      title="Browse listings"
      body="Search results arrive in the next milestone. Browsing needs a signed-in session, so this page will call GET /properties with the criteria below."
      detail={hasCriteria ? `criteria → ${search}` : undefined}
    />
  );
}
