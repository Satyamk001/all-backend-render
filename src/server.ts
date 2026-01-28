import server from './app.js';
import { env } from './config/env.js';
import { assertDatabaseConnection } from './db/db.js';
import { logger } from './lib/logger.js';

async function boostrap() {
  try {
    await assertDatabaseConnection();

    const port = Number(env.PORT) || 5000;

    server.listen(port, () => {
      logger.info(`Server is now listening to port: ${port}`);
    });
  } catch (err) {
    logger.error("Failed's to start the server", `${(err as Error).message}`);
    process.exit(1);
  }
}

boostrap();
