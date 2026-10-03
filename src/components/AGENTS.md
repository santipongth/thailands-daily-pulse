# AGENTS.md (src/components)

- The masthead ticker reads today's ranked signals directly and links each item to its family page; it never creates fallback numbers or changes detection logic .
- Brief front page (`brief-frontpage.tsx`): numbers only from brief items/real rows; AI illustrations (`brief-images.server.ts`, private bucket `brief-images`, signed URLs via `getBriefImages`) generated after publish, no text in images, labelled AI; 402/403 pause via app_settings `brief_images_paused`.
