
"use strict"

// =====================================================================
// Socket & Canvas
// =====================================================================
const socket = io();
const gameWindow = document.querySelector(".game-window");
const canvas = document.querySelector(".canvas-1");
const ctx = canvas.getContext("2d");

const gamingSize = {
   height: 800,
   width: 1100,
}

gameWindow.style = `
   height: ${gamingSize.height}px;
   width: ${gamingSize.width}px
`;

canvas.height = gamingSize.height;
canvas.width = gamingSize.width;


// =====================================================================
// Chatting
// =====================================================================
const chatDisplayMess = document.querySelector(".chat-display-mess");
const chatEnter = document.querySelector(".chat-enter");
const chatInput = document.querySelector(".chat-enter input");
const clearChatBtn = document.querySelector(".clear-chat-btn");

const clearChat = () => {
   for (let i = 0; i < chatDisplayMess.children.length; i++) {
      chatDisplayMess.children[i].remove();
      i--;
   }
}

const chatResponse = (data) => chatDisplayMess.innerHTML += `<p class="message">${data}</p>`

socket.on("addMessage", data => chatResponse(data));
socket.on("evalResponse", data => chatResponse(data));

chatEnter.onsubmit = (event) => {
   event.preventDefault();
   if(chatInput.value[0] === "/") socket.emit("evalServer", chatInput.value.slice(1));
   else if(chatInput.value !== "") socket.emit("sendMessage", chatInput.value);
   chatInput.value = "";
}

clearChatBtn.addEventListener("click", () => clearChat());


// =====================================================================
// Floating Messages
// =====================================================================
let floatTextArray = [];

const handleFloatingMessages = () => {
   for(let i = 0; i < floatTextArray.length; i++) {
      
      let message = floatTextArray[i];
      message.update();
      message.draw();
      
      if(message.displayDuration <= 0) {
         floatTextArray.splice(i, 1);
         i--;
      }
   }
}


// =====================================================================
// Client Sync
// =====================================================================
socket.on("newSituation", (playerData) => {
   ctx.clearRect(0, 0, canvas.width, canvas.height);
   
   drawMap();

   playerData.forEach(player => {
      drawPlayer(player, ctx);
      drawAttackArea(player, ctx);
      enemyDamageTaken(player, ctx);

      drawHealthBar(player, ctx);
      drawManaBar(player, ctx);
      drawEnergyBar(player, ctx);

      playerDeathScreen(player);
   });
   
   handleFloatingMessages();
});