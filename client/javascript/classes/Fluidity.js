
"use strict"

// =====================================================================
// Fluidity Game Bar
// =====================================================================
class Fluidity {
   constructor(ctx, img, barSpecs) {
      
      this.ctx = ctx;
      this.img = img;
      this.barSpecs = barSpecs;
      this.stateStr = barSpecs.stateStr;
   }

   getFameFluid() {

      let origin_X = 0;
      // const fluidSpeed = 15;
      const fluidSpeed = 3;

      let fullBarWidth = this.barSpecs.width - (65 *this.barSpecs.fameScale_X);
      let miniBarWidth = this.barSpecs.fameCost /this.barSpecs.baseFame *fullBarWidth;
      let calcWidth = (this.barSpecs.fameFluid /this.barSpecs.fameCost) *miniBarWidth;
      
      if(calcWidth <= 0) calcWidth = 0;
      if(this.barSpecs.fameFluid < this.barSpecs.fameCost) this.barSpecs.fameFluid += fluidSpeed;
      // origin_X = this.barSpecs.fameValue /this.barSpecs.baseFame *fullBarWidth;
      
      this.ctx.drawImage(
         this.img,
         552, 477, 26, 48,
         this.barSpecs.x + (32 * this.barSpecs.fameScale_X) +origin_X, // <== *****
         this.barSpecs.y +19    +30,
         calcWidth,
         this.barSpecs.height - 27
      );

      origin_X = this.barSpecs.fameValue /this.barSpecs.baseFame *fullBarWidth;
   }
}