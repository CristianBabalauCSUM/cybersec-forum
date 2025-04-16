Object.defineProperty(String.prototype, 'capitalize', {
    value: function () {
      let str = '';
  
        for (const word of this.slice(0, this.length - 1).split(' ')) {
          str += word.charAt(0).toUpperCase() + word.slice(1) + ' ';
        }
        return str;
  

  
    },
    writable: true, // optional: allow overwriting
    configurable: true // optional: allow deleting
  });

  Object.defineProperty(String.prototype, 'generateSlug', {
    value: function () {
      let str = '';
      for (const word of this.trim().split(' ')) {
        str += word.toLowerCase() + '-';
      }
      return str.slice(0, str.length - 1);
    },
    writable: true, // optional: allow overwriting
    configurable: true // optional: allow deleting
  });