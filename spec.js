describe('shephy', function () {
  var S = shephy;
  var any = jasmine.any;

  describe('clone', function () {
    it('recursively copy a given object', function () {
      var x = {a: {b: {c: ['...']}}};
      var xd = S.clone(x);

      expect(xd).toEqual(x);
      expect(xd).not.toBe(x);
      expect(xd.a).toEqual(x.a);
      expect(xd.a).not.toBe(x.a);
      expect(xd.a.b).toEqual(x.a.b);
      expect(xd.a.b).not.toBe(x.a.b);
      expect(xd.a.b.c).toEqual(x.a.b.c);
      expect(xd.a.b.c).not.toBe(x.a.b.c);
    });
  });
  describe('makeInitalWorld', function () {
    it('makes a new world', function () {
      var w = S.makeInitalWorld();

      [1, 3, 10, 30, 100, 300, 1000].forEach(function (n) {
        expect(w.sheepStock[n].length).toEqual(n == 1 ? 6 : 7);
        w.sheepStock[n].forEach(function (c) {
          expect(c.type).toEqual(S.CARD_TYPE_SHEEP);
          expect(c.rank).toEqual(n);
        });
      });

      expect(w.field.length).toEqual(1);
      expect(w.field[0].type).toEqual(S.CARD_TYPE_SHEEP);
      expect(w.field[0].rank).toEqual(1);

      expect(w.enemySheepCount).toEqual(1);

      expect(w.deck.length).toEqual(22);
      w.deck.forEach(function (c) {
        expect(c.type).toEqual(S.CARD_TYPE_EVENT);
      });

      expect(w.hand.length).toEqual(0);
      expect(w.discardPile.length).toEqual(0);
      expect(w.exile.length).toEqual(0);
    });
    it('returns a world with the same regions except Deck', function () {
      var w0 = S.makeInitalWorld();
      var wt = S.makeInitalWorld();

      [
        'sheepStock',
        'field',
        'enemySheepCount',
        'hand',
        'discardPile',
        'exile'
      ].forEach(function (member) {
        expect(wt[member]).toEqual(w0[member]);
      });

      var ns0 = w0.deck.map(function (c) {return c.name;});
      ns0.sort();
      var nst = wt.deck.map(function (c) {return c.name;});
      nst.sort();
      expect(ns0).toEqual(nst);
    });
    it('returns a shuffled Deck with the same set of cards', function () {
      while (true) {
        var w0 = S.makeInitalWorld();
        var wt = S.makeInitalWorld();
        var ns0 = w0.deck.map(function (c) {return c.name;});
        var nst = wt.deck.map(function (c) {return c.name;});
        if (ns0 == nst)
          continue;

        expect(ns0).not.toEqual(nst);
        break;
      }
    });
  });
  describe('gainX', function () {
    it('takes a Sheep card from Sheep Stock and puts into Field', function () {
      var w = S.makeInitalWorld();
      var c = w.sheepStock[3][7 - 1];

      expect(w.field.length).toEqual(1);
      expect(w.field[0].rank).toEqual(1);
      expect(w.sheepStock[3].length).toEqual(7);

      S.gainX(w, 3);

      expect(w.field.length).toEqual(2);
      expect(w.field[0].rank).toEqual(1);
      expect(w.field[1]).toBe(c);
      expect(w.sheepStock[3].length).toEqual(6);
    });
    it('does nothing if no Sheep with a given rank is available', function () {
      var w = S.makeInitalWorld();
      w.sheepStock[3] = [];

      expect(w.field.length).toEqual(1);
      expect(w.field[0].rank).toEqual(1);
      expect(w.sheepStock[3].length).toEqual(0);
      expect(w.sheepStock[10].length).toEqual(7);

      S.gainX(w, 3);

      expect(w.field.length).toEqual(1);
      expect(w.field[0].rank).toEqual(1);
      expect(w.sheepStock[3].length).toEqual(0);
      expect(w.sheepStock[10].length).toEqual(7);

      S.gainX(w, 10);

      expect(w.field.length).toEqual(2);
      expect(w.field[0].rank).toEqual(1);
      expect(w.field[1].rank).toEqual(10);
      expect(w.sheepStock[3].length).toEqual(0);
      expect(w.sheepStock[10].length).toEqual(6);
    });
    it('does nothing if no space is available in Field', function () {
      function test(n) {
        expect(w.field.length).toEqual(1 + n);
        expect(w.field[0].rank).toEqual(1);
        for (var i = 1; i < n; i++)
          expect(w.field[i].rank).toEqual(3);
        expect(w.sheepStock[3].length).toEqual(7 - n);
      }

      var w = S.makeInitalWorld();
      expect(w.field.length).toEqual(1);
      expect(w.field[0].rank).toEqual(1);
      expect(w.sheepStock[3].length).toEqual(7);

      S.gainX(w, 3);
      S.gainX(w, 3);
      S.gainX(w, 3);
      S.gainX(w, 3);
      S.gainX(w, 3);
      test(5);

      S.gainX(w, 3);
      test(6);

      S.gainX(w, 3);
      test(6);
    });
  });
  describe('releaseX', function () {
    it('moves a specified Sheep card in Field to Sheep Stock', function () {
      var w = S.makeInitalWorld();
      S.gainX(w, 3);
      S.gainX(w, 10);
      var c = w.field[1];

      expect(w.field.length).toEqual(3);
      expect(w.field[0].rank).toEqual(1);
      expect(w.field[1].rank).toEqual(3);
      expect(w.field[2].rank).toEqual(10);
      expect(w.sheepStock[1].length).toEqual(6);
      expect(w.sheepStock[3].length).toEqual(6);
      expect(w.sheepStock[10].length).toEqual(6);
      expect(w.sheepStock[3][w.sheepStock[3].length - 1]).not.toBe(c);

      S.releaseX(w, 1);

      expect(w.field.length).toEqual(2);
      expect(w.field[0].rank).toEqual(1);
      expect(w.field[1].rank).toEqual(10);
      expect(w.sheepStock[1].length).toEqual(6);
      expect(w.sheepStock[3].length).toEqual(7);
      expect(w.sheepStock[10].length).toEqual(6);
      expect(w.sheepStock[3][w.sheepStock[3].length - 1]).toBe(c);
    });
  });
  describe('exileX', function () {
    it('moves a card in a region to Exile', function () {
      var w = S.makeInitalWorld();
      var c1 = w.field[0];
      var c3 = w.sheepStock[3][w.sheepStock[3].length - 1];

      expect(w.field.length).toEqual(1);
      expect(w.field[0]).toBe(c1);
      expect(w.sheepStock[3].length).toEqual(7);
      expect(w.sheepStock[3][w.sheepStock[3].length - 1]).toBe(c3);
      expect(w.exile.length).toEqual(0);

      S.exileX(w, w.field, 0);

      expect(w.field.length).toEqual(0);
      expect(w.sheepStock[3].length).toEqual(7);
      expect(w.sheepStock[3][w.sheepStock[3].length - 1]).toBe(c3);
      expect(w.exile.length).toEqual(1);
      expect(w.exile[0]).toBe(c1);

      S.exileX(w, w.sheepStock[3], w.sheepStock[3].length - 1);

      expect(w.field.length).toEqual(0);
      expect(w.sheepStock[3].length).toEqual(6);
      expect(w.sheepStock[3][w.sheepStock[3].length - 1]).not.toBe(c3);
      expect(w.exile.length).toEqual(2);
      expect(w.exile[0]).toBe(c1);
      expect(w.exile[1]).toBe(c3);
    });
  });
  describe('drawX', function () {
    it('moves the top card in Deck to Hand', function () {
      var w = S.makeInitalWorld();
      var c = w.deck[w.deck.length - 1];

      expect(w.hand.length).toEqual(0);
      expect(w.deck[w.deck.length - 1]).toBe(c);

      S.drawX(w);

      expect(w.hand.length).toEqual(1);
      expect(w.hand[0]).toBe(c);
      expect(w.deck[w.deck.length - 1]).not.toBe(c);
    });
    it('does nothing if Deck is empty', function () {
      var w = S.makeInitalWorld();
      w.deck = [];

      expect(w.hand.length).toEqual(0);
      expect(w.deck.length).toEqual(0);

      S.drawX(w);

      expect(w.hand.length).toEqual(0);
      expect(w.deck.length).toEqual(0);
    });
    it('does nothing if Hand is full', function () {
      function test(n) {
        expect(w.hand.length).toEqual(n);
        expect(w.deck.length).toEqual(22 - n);
      }
      var w = S.makeInitalWorld();

      test(0);

      for (var i = 1; i <= 5; i++) {
        S.drawX(w);
        test(i);
      }

      S.drawX(w);
      test(5);
    });
  });
  describe('remakeDeckX', function () {
    it('puts cards in Discard Pile into Deck and shuffles them', function () {
      var w = S.makeInitalWorld();
      var ns0 = w.deck.map(function (c) {return c.name;});
      w.discardPile.push(w.deck.pop());

      expect(w.hand.length).toEqual(0);
      expect(w.deck.length).toEqual(21);
      expect(w.discardPile.length).toEqual(1);

      S.remakeDeckX(w);
      var nsd = w.deck.map(function (c) {return c.name;});

      expect(w.hand.length).toEqual(0);
      expect(w.deck.length).toEqual(22);
      expect(w.discardPile.length).toEqual(0);

      expect(nsd).not.toEqual(ns0);  // FIXME: Rarely fails.
      expect(nsd.concat().sort()).toEqual(ns0.concat().sort());
    });
  });
  describe('discardX', function () {
    it('moves a card in Hand to Discard Pile', function () {
      var w = S.makeInitalWorld();
      S.drawX(w);
      S.drawX(w);
      S.drawX(w);
      var c1 = w.hand[0];
      var c2 = w.hand[1];
      var c3 = w.hand[2];

      expect(w.hand.length).toEqual(3);
      expect(w.discardPile.length).toEqual(0);

      S.discardX(w, 1);

      expect(w.hand.length).toEqual(2);
      expect(w.hand[0]).toBe(c1);
      expect(w.hand[1]).toBe(c3);
      expect(w.discardPile.length).toEqual(1);
      expect(w.discardPile[0]).toBe(c2);

      S.discardX(w, 0);

      expect(w.hand.length).toEqual(1);
      expect(w.hand[0]).toBe(c3);
      expect(w.discardPile.length).toEqual(2);
      expect(w.discardPile[0]).toBe(c2);
      expect(w.discardPile[1]).toBe(c1);
    });
  });
  describe('shouldDraw', function () {
    it('returns false if Hand is full', function () {
      expect(S.shouldDraw({hand: [1, 2, 3, 4, 5], deck: ['...']})).toBeFalsy();
    });
    it('returns false if Deck is empty', function () {
      expect(S.shouldDraw({hand: [1, 2, 3, 4], deck: []})).toBeFalsy();
    });
    it('returns true if Hand is not full and Deck is not empty', function () {
      expect(S.shouldDraw({hand: [1, 2, 3, 4], deck: ['...']})).toBeTruthy();
    });
  });
  describe('makeGameTree', function () {
    it('makes a whole game tree from a given world', function () {
      var w = S.makeInitalWorld();
      var gt = S.makeGameTree(w);

      expect(gt.world).toBe(w);
      expect(gt.moves).toEqual(any(Array));
    });
  });
  describe('listPossibleMoves', function () {
    it('lists only one move "draw cards" from the initial world', function () {
      var w0 = S.makeInitalWorld();
      var moves = S.listPossibleMoves(w0);

      expect(moves).toEqual(any(Array));
      expect(moves.length).toEqual(1);
      expect(moves[0].description).toEqual('Draw cards');
      expect(moves[0].gameTreePromise).toEqual(any(Function));

      var wd = S.force(moves[0].gameTreePromise).world;
      expect(w0.hand.length).toEqual(0);
      expect(w0.deck.length).toEqual(22);
      expect(wd.hand.length).toEqual(5);
      expect(wd.deck.length).toEqual(17);
    });
    it('lists nothing if the game is lost by 1000 enemies', function () {
      var w = S.makeInitalWorld();

      w.enemySheepCount = 1;
      expect(S.listPossibleMoves(w).length).toEqual(1);

      w.enemySheepCount = 1000;
      expect(S.listPossibleMoves(w).length).toEqual(0);
    });
    it('lists only "remake Deck" if Hand and Deck are empty', function () {
      var w = S.makeInitalWorld();
      w.discardPile = w.deck;
      w.deck = [];

      expect(w.hand.length).toEqual(0);
      expect(w.deck.length).toEqual(0);
      expect(w.discardPile.length).toEqual(22);
      expect(w.enemySheepCount).toEqual(1);

      var moves = S.listPossibleMoves(w);
      expect(moves.length).toEqual(1);
      expect(moves[0].description).toEqual('Remake Deck then fill Hand');
      var wd = S.force(moves[0].gameTreePromise).world;
      expect(wd.hand.length).toEqual(5);
      expect(wd.deck.length).toEqual(17);
      expect(wd.discardPile.length).toEqual(0);
      expect(wd.enemySheepCount).toEqual(10);
    });
    it('lists nothing if the game is lost by no Sheep in Field', function () {
      var w = S.makeInitalWorld();
      S.releaseX(w, 0);

      expect(w.field.length).toEqual(0);
      expect(w.sheepStock[1].length).toEqual(7);
      expect(S.listPossibleMoves(w).length).toEqual(0);
    });
    it('lists nothing if the game is won by 1000 Sheep in Field', function () {
      var wl = S.makeInitalWorld();
      S.releaseX(wl, 0);
      S.gainX(wl, 300);
      S.gainX(wl, 300);
      S.gainX(wl, 300);
      S.gainX(wl, 100);
      expect(S.listPossibleMoves(wl).length).not.toEqual(0);

      var ww = S.makeInitalWorld();
      S.releaseX(ww, 0);
      S.gainX(ww, 1000);
      expect(S.listPossibleMoves(ww).length).toEqual(0);
    });
    it('lists "play a card in Hand" otherwise', function () {
      var w = S.makeInitalWorld();
      for (var i = 0; i < 5; i++)
        S.drawX(w);

      var moves = S.listPossibleMoves(w);
      expect(moves.length).toEqual(5);
      for (var i = 0; i < 5; i++) {
        expect(moves[i].description).toEqual('Play ' + w.hand[i].name);
      }
    });
  });
});

// vim: expandtab softtabstop=2 shiftwidth=2
// vim: foldmethod=expr
// vim: foldexpr=getline(v\:lnum)=~#'\\v<x?(describe|it|beforeEach|afterEach)>.*<function>\\s*\\([^()]*\\)\\s*\\{'?'a1'\:(getline(v\:lnum)=~#'^\\s*});$'&&search('\\v^\\s{'.indent(v\:lnum).'}<x?(describe|it|beforeEach|afterEach)>','bnW')?'s1'\:'=')
