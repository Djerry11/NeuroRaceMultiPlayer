class Controls {
  constructor(type) {
    this.forward = false;
    this.left = false;
    this.right = false;
    this.reverse = false;
  }
}

// class Controls {
//   constructor(type) {
//     this.forward = false;
//     this.left = false;
//     this.right = false;
//     this.reverse = false;
//     switch (type) {
//       case "KEYS":
//         this.#addKeyboardListeners(
//           "ArrowLeft",
//           "ArrowRight",
//           "ArrowUp",
//           "ArrowDown"
//         );
//         break;
//       case "KEYS1":
//         this.#addKeyboardListeners("a", "d", "w", "s");
//         break;
//       case "DUMMY":
//         this.forward = false;
//         break;
//       case "SOCKET":
//         break;
//     }
//   }

//   #addKeyboardListeners(leftKey, rightKey, forwardKey, reverseKey) {
//     document.addEventListener("keydown", (event) => {
//       switch (event.key) {
//         case leftKey:
//           this.left = true;
//           break;
//         case rightKey:
//           this.right = true;
//           break;
//         case forwardKey:
//           this.forward = true;
//           break;
//         case reverseKey:
//           this.reverse = true;
//           break;
//       }
//     });

//     document.addEventListener("keyup", (event) => {
//       switch (event.key) {
//         case leftKey:
//           this.left = false;
//           break;
//         case rightKey:
//           this.right = false;
//           break;
//         case forwardKey:
//           this.forward = false;
//           break;
//         case reverseKey:
//           this.reverse = false;
//           break;
//       }
//     });
//   }
// }
