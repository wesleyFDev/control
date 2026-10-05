// This file is required for Expo/React Native SQLite migrations - https://orm.drizzle.team/quick-sqlite/expo

import m0000 from './20260930142752_init/migration.sql';
import m0001 from './20260930174307_category_keywords/migration.sql';
import m0002 from './20261002181821_pluggy/migration.sql';
import m0003 from './20261002184802_notification_captures/migration.sql';
import m0004 from './20261002190934_bills/migration.sql';
import m0005 from './20261005114722_notification_app_label/migration.sql';

  export default {
    migrations: {
      "20260930142752_init": m0000,
"20260930174307_category_keywords": m0001,
"20261002181821_pluggy": m0002,
"20261002184802_notification_captures": m0003,
"20261002190934_bills": m0004,
"20261005114722_notification_app_label": m0005
}
  }
  