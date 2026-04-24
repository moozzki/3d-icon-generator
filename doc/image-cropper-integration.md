
***

### 📄 Prompt for AI Agent: Implement Kibo UI Image Cropper & Experimental Toggle

> "I want to update our feature requirements. Instead of building a custom cropper from scratch, we will use the `image-crop` component from Kibo UI for the pre-processing step, along with an 'Experimental' toggle for the generation settings.
> 
> **Action Required:**
> 1. **Install Kibo UI Component:** Run this exact command to add the cropper component to our project:
>    ```bash
>    npx kibo-ui add image-crop
>    ```
> 2. **Update Upload Flow:** Modify the image upload process. When a user selects an image, it should first open a modal/dialog utilizing the newly installed Kibo UI `image-crop` component. 
> 3. **Save Cropped Image:** Allow the user to adjust the crop area and click 'Apply'. Once applied, save the *cropped* image (as base64 or File object) to the main form's state to be used as the reference image, instead of the original raw image.
> 4. **Add Experimental Toggle:** Below the cropped image preview in the main form, add a Shadcn `Switch` component. 
>    - **Label:** 'Keep all people in icon (Experimental)'
>    - **Description:** 'Best for 2-3 people. Default focuses on main person.'
> 5. **State Binding:** Bind this Switch to a boolean state (e.g., `keepMultiplePeople`). Ensure this boolean is attached to the API payload sent to our `/api/generate` backend endpoint so we can adjust the prompt logic later."

***