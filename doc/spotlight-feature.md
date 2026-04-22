

### 📄 PRD: Spotlight Feature & Glassmorphism IG Story Share Card

**Subject:** Implementation of 'Spotlight' visibility switch and a minimal, premium Glassmorphism Instagram Story Share Card.

**1. 'Spotlight' Feature (Public Visibility Switch):**
- In the icon detail dialog or grid card option menu, add a toggle switch for visibility (Private vs. Spotlight). separate option with a separator from refine and download option in grid card. also add visibility status badge in grid card. if the icon is spotlight, add a spotlight badge to the icon in the grid card. if the icon is private, add a private badge to the icon in the grid card.
- add a button in grid card option menu to share to IG Story below to visibility option. 
- add button share and visibiltity into action sectio inside side sheet trigger in dashboard and jobsid page. 
- If the user toggles it from Private to Public (Spotlight), intercept the action with an `AlertDialog` (from shadcn/ui) that asks: *"Are you sure you want to spotlight this icon?"*
- If confirmed, update the `isPublic` boolean status in the database.

**2. Premium Instagram Story Share Card (Minimalist & Glassmorphism):**
- Add a 'Share to IG Story' button in the UI.
- Create a hidden React component that acts as the 9:16 aspect ratio template for the shareable card.

**Card Design & Layout Specifications:**
- **Background Aesthetic:** Since the generated 3D icons have solid white backgrounds, the card's main wrapper MUST use a **vibrant, modern gradient** combined with a **Glassmorphism effect** (translucent background, `backdrop-blur`, subtle white/transparent borders) to make the white-background image pop seamlessly.
- **Overall Container:** A vertical 9:16 aspect ratio card with large, smooth rounded corners (e.g., Tailwind `rounded-[32px]`) and a soft, premium drop shadow.
- **Upper Part (Visuals):**
  - The generated 3D icon image (cleanly framed within the glassmorphism container).
  - Minimal floating badges at the top-left (e.g add dynamic badge showing the generated style, like 'plastic' and another badge showing the position, like 'isometric'). 
- **Lower Part (Minimalist Text & CTA):**
  - **Main Title:** Use a strong, branded title. Set the text to **"Crafted on Audora"** using a bold, elegant font.
  - *Strict constraint:* **DO NOT** include the prompt text, credits, or any subtitles. Keep the lower area extremely clean.
  - **CTA Button:** A sleek, pill-shaped dark/black button placed in the bottom rightcontaining the text **"Try Audora"** along with an up-right arrow icon (↗) with text domain useaudora.com.
  - **Watermark:** A subtle Audora logo/wordmark at the bottom center or bottom left.

**3. Image Generation and Sharing Logic:**
- Use a library like `html-to-image` (or `dom-to-image`) to convert this hidden glassmorphism DOM element into a high-quality image data URL when the share button is clicked.
- Implement the `navigator.share()` API. 
  - If the device supports sharing files (e.g., Mobile Safari/Chrome), share the generated image file directly so the user can seamlessly add it to their Instagram Story. 
  - If `navigator.share` is not supported (e.g., on Desktop), fallback to automatically downloading the image with the filename `audora-story-[job_id].png`.
