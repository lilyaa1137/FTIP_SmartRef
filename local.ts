import { createApp } from './server';

const PORT = Number(process.env.PORT) || 3000;

createApp().then((app) => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FTIP SmartRef berjalan di http://localhost:${PORT}`);
  });
});