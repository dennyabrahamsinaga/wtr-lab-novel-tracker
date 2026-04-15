# UAT Scenarios

## Browse and Search

1. Open `http://localhost:3000/`.
2. Search for `Invincible: He Takes on the Empress As His Disciple and Establishes the Evergreen Immortal Sect`.
3. Confirm at least one result is returned and the first result title matches the query.
4. Toggle `Status` between `Ongoing`, `Completed`, and `Ongoing + Completed`.
5. Confirm each state returns only novels with the selected status.
6. Change `Sort` between `Recently updated`, `Rating`, `Best reviews`, and `Most chapters`.
7. Confirm the card order changes accordingly and the page remains responsive.

## Best Page

1. Open `http://localhost:3000/best`.
2. Confirm each card links to a novel detail route whose title matches the opened novel.
3. Confirm stale WTR redirects do not surface mismatched titles or slugs.
4. Move to the next page and back to verify pagination works.

## Novel Detail

1. Open a novel card from browse.
2. Confirm the detail page does not return HTTP 500 if WTR is slow or redirects.
3. Confirm the page either:
   - shows the novel metadata, reviews, and latest chapter metadata, or
   - shows the graceful `Novel unavailable` fallback with the WTR link.
4. Confirm the Indonesian panel only shows Indonesian text when WTR actually provides a distinct Indonesian description.

## Favorites and Notifications

1. Open a novel detail page and click `Favorite`.
2. Open `http://localhost:3000/settings`.
3. Confirm the favorite appears in the `Favorites` panel.
4. Enable notifications after granting browser permission.
5. Confirm `Status: Subscribed` is shown.
6. Trigger the cron endpoint locally with `GET /api/cron/check-updates`.
7. Confirm the checkpoint only advances when at least one push delivery succeeds.

