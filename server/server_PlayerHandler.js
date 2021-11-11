
"use strict"

// =====================================================================
// Scrips import
// =====================================================================
const Player = require("./classes/Player.js");
const collision = require("./collisions.js");


// =====================================================================
// Global Variables
// =====================================================================
let playerList = {};


// =====================================================================
// Player connection
// =====================================================================
exports.onConnect = (socket) => {
   const player = new Player(socket.id);
   playerList[socket.id] = player;
   
   socket.on("playerName", (data) => {
      player.name = data

      // Init Player Stats
      socket.emit("playerStats", {
         playerName: player.name,
         health: player.baseHealth,
         mana: player.baseMana,
         regenMana: player.baseRegenMana,
         energy: player.baseEnergy,
         regenEnergy: player.baseRegenEnergy,
         GcD: player.baseGcD,
      });
   
      // Init Player Score
      socket.emit("playerScore", {
         kills: player.kills,
         died: player.died,
      });
   });

   // Movements
   socket.on("up", (state) => player.up = state);
   socket.on("down", (state) => player.down = state);
   socket.on("left", (state) => player.left = state);
   socket.on("right", (state) => player.right = state);

   // Spells cast
   socket.on("heal", (state) => player.cast_Heal = state);
   
   // States
   socket.on("run", (state) => player.isRunning = state);
   socket.on("attack", (state) => player.isAttacking = state);
   socket.on("casting", (state) => player.isCasting = state);
}


// =====================================================================
// Player disconnection
// =====================================================================
exports.onDisconnect = (socket) => {
   delete playerList[socket.id];
}


// =====================================================================
// Player Global Count Down   (Attack & Spell Cast)
// =====================================================================
const playerGcD = (player, socketList) => {
   
   // Regen Mana
   if(player.mana < player.baseMana) player.mana += player.regenMana;
   
   // Regen GcD
   if(player.speedGcD < player.GcD) {
      player.speedGcD +=process.env.SYNC_COEFF* 1;
      if(player.isAttacking) player.isAttacking = false;
   }
   
   if(player.speedGcD >= player.GcD) {

      // Player Attack
      if(player.isAttacking && !player.attack_isAnimable) {

         player.speedGcD = 0;
         player.isAttacking = false;
         player.attack_isAnimable = true;

         setTimeout(() => player.attack_isAnimable = false,
            animTimeOut(anim.attack.index, anim.attack.spritesNumber)
         );

         damagingEnemy(player, socketList);
         // damagingEnemy(player, mobList); // <== When Mob class gonna be created
      }

      // Player Spell Cast
      if(player.isCasting) {
         
         player.isCasting = false;
         playerHealing(player, socketList);
      }
   }
}

// =====================================================================
// Player Movements
// =====================================================================
const playerMovements = (player) => {
      
   let moveSpeed = player.walkSpeed;
   if(player.isRunning && player.isRunnable) moveSpeed = player.runSpeed;

   // Map Border Reached ==> Temporary (Await Scrolling Cam)
   if(player.up && player.y < 65
   || player.down && player.y > 740
   || player.left && player.x < 50
   || player.right && player.x > 1150) {
      moveSpeed = 0;
   }

   const axisOffset = {
      yAxis_x: 0,
      yAxis_y: 45,
      xAxis_x: 30,
      xAxis_y: 10,
   }
   
   crossMove(player, moveSpeed, axisOffset);
   diagMove(player, moveSpeed, axisOffset);
}

const crossMove = (player, moveSpeed, axisOffset) => {

   // Up (yAxis)
   if(player.up) {
      player.frameY = 0;
      player.y -= moveSpeed;
      player.attkOffset_X = axisOffset.yAxis_x;
      player.attkOffset_Y = -axisOffset.yAxis_y;
   }
   
   // Down (yAxis)
   if(player.down) {
      player.frameY = 1;
      player.y += moveSpeed;
      player.attkOffset_X = axisOffset.yAxis_x;
      player.attkOffset_Y = axisOffset.yAxis_y;
   }
   
   // Left (xAxis)
   if(player.left) {
      player.frameY = 2;
      player.x -= moveSpeed;
      player.attkOffset_X = -axisOffset.xAxis_x;
      player.attkOffset_Y = axisOffset.xAxis_y;
   }
   
   // Right (xAxis)
   if(player.right) {      
      player.frameY = 3;
      player.x += moveSpeed;
      player.attkOffset_X = axisOffset.xAxis_x;
      player.attkOffset_Y = axisOffset.xAxis_y;
   }
}

const diagMove = (player, moveSpeed, axisOffset) => {

   let offset = ((axisOffset.yAxis_y + axisOffset.xAxis_x) / 2) * 0.7;

   // Up & Left
   if(player.up && player.left) {
      player.frameY = 0;
      player.attkOffset_X = -offset;
      player.attkOffset_Y = -offset; 
   }

   // Up & Right
   if(player.up && player.right) {
      player.frameY = 0;
      player.attkOffset_X = offset;
      player.attkOffset_Y = -offset;
   }

   // Down & Left
   if(player.down && player.left) {
      player.frameY = 1;
      player.attkOffset_X = -offset;
      player.attkOffset_Y = offset;
   }

   // Down & Right
   if(player.down && player.right) {
      player.frameY = 1;
      player.attkOffset_X = offset;
      player.attkOffset_Y = offset;
   }

   
   // =============== Diag Speed ===============
   if(player.up && player.left
   ||player.up && player.right
   ||player.down && player.left
   ||player.down && player.right) {
      moveSpeed = Math.sqrt(moveSpeed);
   }
}


// =====================================================================
// Player Running
// =====================================================================
const playerRunning = (player) => {
   if(player.energy < player.baseEnergy) player.energy += player.regenEnergy;

   if(player.isRunning && player.isRunnable) {
      
      player.energy -= player.energyCost;
      if(player.energy <= 0) player.energy = 0;
      if(player.energy < player.energyCost) player.isRunnable = false;
   }

   if(!player.isRunning) player.isRunnable = true;
}


// =====================================================================
// Player Healing
// =====================================================================
const playerHealing = (player, socketList) => {

   if(player.cast_Heal
   && player.mana >= player.healCost
   && player.health < player.baseHealth) {

      player.speedGcD = 0;
      player.cast_Heal = false;
      player.heal_isAnimable = true;
      
      setTimeout(() => player.heal_isAnimable = false,
         animTimeOut(anim.heal.index, anim.heal.spritesNumber)
      );

      player.calcHealing = player.healRnG();
      player.health += player.calcHealing;
      player.mana -= player.healCost;

      if(player.health > player.baseHealth) player.health = player.baseHealth;
      let socket = socketList[player.id];

      socket.emit("getHeal", {
         x: player.x,
         y: player.y,
         calcHealing: player.calcHealing,
      });
   }
}


// =====================================================================
// Damaging Enemy
// =====================================================================
const damagingEnemy = (player, socketList) => {

   for(let i in playerList) {
      let otherPlayer = playerList[i];

      if(player !== otherPlayer
      && !otherPlayer.isDead
      && collision.circle_toCircle_withOffset(player, player.attkOffset_X, player.attkOffset_Y, player.attkRadius, otherPlayer)) {
         
         otherPlayer.calcDamage = player.damageRnG();
         otherPlayer.health -= otherPlayer.calcDamage;
         
         let socket = socketList[player.id];

         if(otherPlayer.health <= 0) {
            player.kills++;
            playerDeath(otherPlayer);

            socket.emit("playerScore", {
               kills: player.kills,
               died: player.died,
            });
         }

         const otherPlayerData = {
            x: otherPlayer.x,
            y: otherPlayer.y,
            calcDamage: otherPlayer.calcDamage,
         };
         
         let otherSocket = socketList[otherPlayer.id];
         otherSocket.emit("getDamage", otherPlayerData);
         socket.emit("giveDamage", otherPlayerData);
      }
   }
}


// =====================================================================
// Player Death
// =====================================================================
const playerDeath = (player) => {

   player.health = 0;
   player.isDead = true;
   player.died++;
   player.deathCounts++;
   
   if(player.deathCounts === 10) player.deathCounts = 0;
   
   const respawnCooldown = setInterval(() => {
      player.respawnTimer --;
      
      if(player.respawnTimer <= 0) {

         player.isDead = false;
         player.isRespawning = true;

         // Reset Player Bars
         player.health = player.baseHealth;
         player.mana = player.baseMana;
         player.energy = player.baseEnergy;
         player.speedGcD = player.GcD;

         // Reset Respawn Timer
         player.respawnTimer = player.baseRespawnTimer;
         player.color = "darkviolet"; // <== Debug Mode

         // ================  Temporary  ================
         player.x = Math.floor(Math.random() * 1000) + 100; // <== Randomize position on respawn
         player.y = Math.floor(Math.random() * 700) + 50;
         // ================  Temporary  ================

         clearInterval(respawnCooldown);
      }
   }, 1000);
}


// =====================================================================
// Handle Player State
// =====================================================================
const anim = {
   idle: {
      index: 2,
      spritesNumber: 29,
   },

   walk: {
      index: 1,
      spritesNumber: 29,
   },

   run: {
      index: 1,
      spritesNumber: 14,
   },

   attack: {
      index: 1,
      spritesNumber: 14,
   },

   heal: {
      index: 2,
      spritesNumber: 14,
   },

   died: {
      index: 3,
      spritesNumber: 29,
   },
}

const animTimeOut = (index, spritesNumber) => {
   return process.env.FRAME_RATE * process.env.SYNC_COEFF * index * spritesNumber / 4;
}

const handlePlayerState = (player) => {
   let isMoving = false;

   if(player.up || player.down || player.left || player.right) {
      isMoving = true;
   }
   
   // Walk State
   if(isMoving && !player.attack_isAnimable && !player.heal_isAnimable) {
      if(player.isRunning && !player.isRunnable || !player.isRunning) {
         player.animation(frame, anim.walk.index, anim.walk.spritesNumber);
         return player.state = "walk";
      }
   }

   // Run State
   if(isMoving && player.isRunning && player.isRunnable && !player.attack_isAnimable) {
      player.animation(frame, anim.run.index, anim.run.spritesNumber);
      return player.state = "run";
   }

   // Attack State
   if(player.attack_isAnimable) {
      player.animation(frame, anim.attack.index, anim.attack.spritesNumber);
      return player.state = "attack";
   }
   
   // Heal State
   if(player.heal_isAnimable) {
      player.animation(frame, anim.heal.index, anim.heal.spritesNumber);
      return player.state = "heal";
   }

   // Idle State
   else if(!isMoving && !player.attack_isAnimable
   || player.up && player.down && !player.left && !player.right
   || player.left && player.right && !player.up && !player.down) {
      
      player.animation(frame, anim.idle.index, anim.idle.spritesNumber);
      return player.state = "idle";
   }
}


// =====================================================================
// Player Update (Every frame)
// =====================================================================
let frame = 0;

exports.playerUpdate = (socketList) => {
   let playerData = [];
   
   for(let i in playerList) {
      let player = playerList[i];
      
      if(!player.isDead) {
         playerGcD(player, socketList);
         playerMovements(player);
         playerRunning(player);
         handlePlayerState(player);
      }

      else {
         player.animation(frame, anim.died.index, anim.died.spritesNumber);
         player.state = "died";
      }

      playerData.push(player);
   }

   frame++;
   return playerData;
}