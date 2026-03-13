/*
  topserver_turbo_v2.sql — Tabla de personajes para servidor Turbo (MariaDB / MySQL 8+)
  Basada en: topservers_v2.sql

  Escenario:
    - `accounts` compartida entre servidores
    - `topservers`   = personajes servidor 1.0
    - `topserver_turbo` = personajes servidor 2.0 (Turbo)

  Tipos optimizados:
    - Money / CPs / MoneySave / MetScrolls / GenesisCoin -> BIGINT
    - Mesh / Avatar / Level -> SMALLINT
    - Reborn / AutoHunting -> TINYINT
    - PKPoints / stats / Status -> INT
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------------------------
-- Estructura de tabla Turbo
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `topserver_turbo`;
CREATE TABLE `topserver_turbo` (
  `EntityID`      BIGINT        NOT NULL,
  `Name`          VARCHAR(25)   NOT NULL DEFAULT '',
  `Money`         BIGINT        NOT NULL DEFAULT 0,
  `CPs`           BIGINT        NOT NULL DEFAULT 0,
  `GuildName`     VARCHAR(255)  DEFAULT NULL,
  `MoneySave`     BIGINT        NOT NULL DEFAULT 0,
  `Mesh`          SMALLINT      NOT NULL DEFAULT 0,
  `Avatar`        SMALLINT      NOT NULL DEFAULT 0,
  `GenesisCoin`   BIGINT        NOT NULL DEFAULT 0,
  `AutoHunting`   TINYINT       NOT NULL DEFAULT 0,
  `PKPoints`      INT           NOT NULL DEFAULT 0,
  `Reborn`        TINYINT       NOT NULL DEFAULT 0,
  `Strength`      INT           NOT NULL DEFAULT 0,
  `Agility`       INT           NOT NULL DEFAULT 0,
  `Vitality`      INT           NOT NULL DEFAULT 0,
  `Spirit`        INT           NOT NULL DEFAULT 0,
  `Additional`    INT           NOT NULL DEFAULT 0,
  `Spouse`        VARCHAR(255)  DEFAULT NULL,
  `Level`         SMALLINT      NOT NULL DEFAULT 1,
  `Status`        INT           NOT NULL DEFAULT 0,
  `MetScrolls`    BIGINT        NOT NULL DEFAULT 0,
  PRIMARY KEY (`EntityID`),
  CONSTRAINT `fk_turbo_char_account`
    FOREIGN KEY (`EntityID`) REFERENCES `accounts` (`EntityID`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 20 personajes ejemplo para Turbo (mismos EntityID de accounts_v2.sql)
-- -----------------------------------------------------------------------------
INSERT INTO `topserver_turbo`
  (`EntityID`, `Name`, `Money`, `CPs`, `GuildName`, `MoneySave`, `Mesh`, `Avatar`, `GenesisCoin`, `AutoHunting`, `PKPoints`, `Reborn`, `Strength`, `Agility`, `Vitality`, `Spirit`, `Additional`, `Spouse`, `Level`, `Status`, `MetScrolls`)
VALUES
  (1046953, 'TurboKnight',    9800000,  850, 'TurboLegion', 2200000, 1003, 215, 350, 1, 120, 2, 2100, 120, 260,  20, 0, NULL,        140, 0, 70),
  (1046954, 'FlashNinja',     7400000, 1200, 'NightCore',   1800000, 2003, 231, 480, 1, 300, 2,  600, 2100, 110, 420, 0, NULL,        140, 0, 95),
  (1046955, 'TitanWall',      6900000,  300, 'SteelOrder',  1500000, 1005, 248, 120, 0,  40, 1,  420,  180, 2450, 80, 0, 'TurboAria', 138, 0, 60),
  (1046956, 'BlazeArrow',     5200000,  640, 'SkyFire',     1200000, 2001, 222, 260, 1, 115, 2,   90, 2200, 120, 240, 0, NULL,        140, 0, 55),
  (1046957, 'QuantumShot',   14200000, 2300, 'Quantum',     4100000, 2001, 205, 990, 1, 410, 2,  110, 2850, 140, 120, 0, NULL,        140, 0, 140),
  (1046958, 'ScarletEdge',    4300000,  520, 'Crimson',      900000, 1003, 233, 180, 0,  88, 1, 1320,   95, 180,  14, 0, NULL,        126, 0, 33),
  (1046959, 'GlacierTank',    8800000,  760, 'Iceborn',     2100000, 1005, 246, 390, 1,  95, 2,  460,  190, 2550, 82, 0, NULL,        140, 0, 78),
  (1046960, 'StormBreaker',  17600000, 3100, 'TurboLegion', 5200000, 1003, 218, 1400,1, 760, 2, 2350,  140, 300,  25, 0, NULL,        140, 0, 180),
  (1046961, 'NightRanger',    6100000,  580, 'NightCore',   1300000, 2001, 227, 230, 1, 170, 2,   95, 2360, 105, 220, 0, NULL,        139, 0, 50),
  (1046962, 'VoidReaper',     3900000,  410, 'Abyss',        820000, 2003, 239, 160, 0,  66, 1,  250, 1180,  70, 210, 0, NULL,        121, 0, 24),
  (1046963, 'NovaBurst',     11800000, 1900, 'CosmosX',     3200000, 2001, 211, 760, 1, 390, 2,  105, 2740, 130, 116, 0, 'TitanWall', 140, 0, 120),
  (1046964, 'ShadeRunner',    5600000,  620, 'ShinobiX',    1400000, 2003, 228, 280, 1, 205, 2,  540, 1960, 100, 360, 0, NULL,        140, 0, 62),
  (1046965, 'RubyFang',      21400000, 4200, 'RedDragonX',  6800000, 1003, 221, 2100,1, 980, 2, 2480,  155, 330,  30, 0, NULL,        140, 0, 240),
  (1046966, 'EaglePrime',     9200000, 1050, 'OlympusX',    2400000, 1005, 244, 510, 1, 180, 2,  470,  210, 2380, 88, 0, NULL,        140, 0, 84),
  (1046967, 'SilverWing',     4700000,  360, 'SkyFire',      950000, 2001, 230, 140, 0,  72, 1,   88, 1620,  96, 185, 0, NULL,        132, 0, 31),
  (1046968, 'ViperNova',      7600000,  930, 'VipersX',     1900000, 1003, 237, 430, 1, 290, 2, 2180,  130, 250,  22, 0, NULL,        140, 0, 90),
  (1046969, 'LumenGuard',     1200000,   90, NULL,           180000, 1005, 251,  30, 0,   5, 0,  180,   85, 620,  30, 0, NULL,         78, 0,  4),
  (1046970, 'DeathPulse',    13200000, 2600, 'DeathGuildX', 3600000, 2003, 224, 980, 1, 540, 2,  700, 2280, 120, 460, 0, NULL,        140, 0, 150),
  (1046971, 'MysticFlux',     6800000,  740, 'MysticsX',    1600000, 1003, 241, 300, 1, 160, 2, 1860,  118, 230,  18, 0, NULL,        140, 0, 68),
  (1046972, 'HammerCore',    16900000, 2800, 'OlympusX',    4700000, 1005, 209, 1200,1, 330, 2,  520,  240, 2720, 96, 0, NULL,        140, 0, 170);

SET FOREIGN_KEY_CHECKS = 1;
