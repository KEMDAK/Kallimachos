class Node {
   constructor () {
      this.words = 0;
      this.prefixes = 0;
      this.edges = {};
   }
}

class Trie {
   constructor (jsonTrie) {
      if(!jsonTrie) {
         this.totalWords = 0;
         this.root = new Node();
         this.alphabet = new Set();
      }
      else {
         this.totalWords = jsonTrie.totalWords;
         this.root = jsonTrie.root;
         this.alphabet = new Set(jsonTrie.alphabet);
      }
   }

   toJSON() {
      return {
         totalWords: this.totalWords,
         root: this.root,
         alphabet: [...this.alphabet]
      };
   }

   addWord (word, frequency) {
      frequency = frequency || 1;
		word.toLowerCase();

      for (var i = 0; i < word.length; i++) {
         this.alphabet.add(word.charAt(i));
      }

      this.totalWords += frequency;

      var helper = function (cur, word, index) {
         if(index === word.length) {
            cur.words += frequency;
            return;
         }

         var c = word.charAt(index);
         cur.prefixes += frequency;

         var nextNode = cur.edges[c];
         if(nextNode === undefined) {
            // new prefix
            nextNode = new Node();
            cur.edges[c] = nextNode;
         }

         helper(nextNode, word, index + 1);
      };

		helper(this.root, word, 0);
	}

   contains (word) {
      var helper = function (cur, word, index) {
         if(index === word.length) return cur.words > 0;

         var c = word.charAt(index);

         var nextNode = cur.edges[c];
         if(nextNode === undefined) {
            // new prefix
            return false;
         }

         return helper(nextNode, word, index + 1);
      };

      return helper(this.root, word.toLowerCase(), 0);
   }

   suggestions (word, editDistance) { // max edit distance 8 (duo to heavy computations)
      var res = {};

      var trie = this;

      var helper = function (cur, index, remEditDistance, out) {
         var c;
         var nextNode;
         if(index < word.length){
            c = word.charAt(index);

            nextNode = cur.edges[c.toLowerCase()];
         }

         if(cur.words > 0) {
            var temp = remEditDistance;
            if(index < word.length)
            // the word is missing some letters
            temp -= (word.length - index);

            if(temp >= 0) {
               var score = ((cur.words * 1.0 / trie.totalWords)) * ((temp + 1) * 1.0 / (editDistance + 1));
               var oldScore = res[out];
               if(oldScore === undefined || oldScore < score)
               res[out] = score;
            }
         }

         // no edit
         if(nextNode)
         helper(nextNode, index + 1, remEditDistance, out + c);

         if(remEditDistance > 0) {
            // we can still edit the word
            // deletion
            if(index < word.length)
            helper(cur, index + 1, remEditDistance - 1, out);

            var capital = (/[A-Z]/.test(c));
            // replace
            trie.alphabet.forEach(function(cn) {
               nextNode = cur.edges[cn];
               if(nextNode && cn != c)
               helper(nextNode, index + 1, remEditDistance - 1, out + ((capital)? cn.toUpperCase() : cn));
            });

            // insertion
            trie.alphabet.forEach(function(cn) {
               nextNode = cur.edges[cn];
               if(nextNode)
               helper(nextNode, index, remEditDistance - 1, out + ((capital)? cn.toUpperCase() : cn));
            });
         }
      };

      if(!this.contains(word))
      helper(this.root, 0, editDistance, '');

      return res;
   }

   addText (text) {
      var dic = text.split(/[ \n]+/gm);
      var Regex = require('./Regex');

      for (var i = 0; i < dic.length; i++) {
         var word = dic[i].toLowerCase();

         if(word.length > 1) {
            for (var j = 0; j < word.length; j++) {
               if(Regex.letter.test(word.charAt(j))) {
                  word = word.substring(j);
                  break;
               }
            }

            for (var j = word.length - 1; j >= 0; j--) {
               if(Regex.letter.test(word.charAt(j))) {
                  word = word.substring(0, j + 1);
                  break;
               }
            }
         }

         this.addWord(word);
      }
   }
}

module.exports = Trie;
