# Runbooks

## Common Operational Tasks

- **Clear LocalStorage:**
  - Open browser dev tools > Application > LocalStorage > Clear site data.
- **Reset App State:**
  - Use in-app settings or clear LocalStorage as above.
- **Update Dependencies:**
  - Run `npm update` and `npm audit fix`.
- **Build for Production:**
  - Run `npm run build`.
- **Test Locally:**
  - Run `npm run dev` and `npm run test`.

## Incident Response

- **UI/Playback Bug:**
  - Check browser console for errors.
  - Try clearing LocalStorage and reloading.
- **Dependency Vulnerability:**
  - Run `npm audit` and update as needed.
