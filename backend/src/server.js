import { createApp } from "./app.js";

const PORT = process.env.PORT || 4000;

const { app } = await createApp();

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Altcha backend listening on ${PORT}`);
});
