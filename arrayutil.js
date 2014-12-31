/*
  fisher-yates shuffle algorithm taken from
  http://sedition.com/perl/javascript-fy.html
*/

Array.prototype.shuffle = function() {
  var i = this.length;
  if ( i == 0 ) return;
  while ( --i ) {
     var j = Math.floor( Math.random() * ( i + 1 ) );
     var tempi = this[i];
     var tempj = this[j];
     this[i] = tempj;
     this[j] = tempi;
   }
   return this;
}
