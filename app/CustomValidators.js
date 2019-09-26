module.exports = {
   customValidators: {
      /* validator to check if the given value is a phone number */
      isPhoneNumber: function(value) {
         if(!value){
            return false;
         }

         return value.match(/^\+?\d+-?\d+-?\d+$/i) === null ? false : true;
      },
      /* validator to check if the given value is an array */
      isArray: function(value, length) {
         if(!length && length !== 0)
         return Array.isArray(value) && typeof value !== "string";
         else
         return Array.isArray(value) && typeof value !== "string" && value.length == length;
      },
      /* validator to check if the given value is an array of type integer */
      isIntArray: function(value) {
         if( Array.isArray(value)){
            for (var i = value.length - 1; i >= 0; i--) {
               if(typeof value[i] === "string" || isNaN(value[i]) ){
                  return false ;
               }
            }
         }
         else{
            return false ;
         }

         return true ;
      },
      /* validator to check if the given value is a String */
      isString: function(value) {
         return typeof value === "string";
      },
      /* validator to check if the given value is a birthdate in the following format (yyyy-mm-dd) */
      isBirthdate:function(dateString) {
         if(!dateString || typeof dateString != "string") return false ;
         var regEx = /^\d{4}-\d{2}-\d{2}$/;
         return dateString.match(regEx) !== null;
      }
   }
};
