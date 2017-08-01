var OpenIDStrategy = require('passport-openid').Strategy;
//var LocalStrategy = require('passport-local').Strategy;

const qs = require('querystring');
const RETURN_URL = 'http://localhost/auth/openid/return';

// Proxies request params to returnUrl by directly setting the returnUrl property.
// This is not a good practice because we're directly modifying a private property
// internally here, but as long as the OpenIDStrategy library remains stable this
// should be fine
class DynamicReturnStrategy extends OpenIDStrategy {
  authenticate(req) {
		if (req.query && !req.query['openid.mode']) {
			this._relyingParty.returnUrl = `${RETURN_URL}?${qs.stringify(req.query)}`;
    }

    super.authenticate(req);
  }
}

module.exports = function (passport) {
  passport.serializeUser(function(user, done) {
    done(null, user);
  });
  passport.deserializeUser(function(user, done) {
    done(null, user);
  });
  /*
  passport.use('login', new LocalStrategy({
    passReqToCallback: true
  }, function(req, username, password, done) {
    process.nextTick(function() {
      connection.
      })
    });
  }));
  */
  passport.use(new DynamicReturnStrategy({
      returnURL: RETURN_URL,
      realm: 'http://localhost/',
      profile: true,
      providerURL: 'https://openid.nus.edu.sg',
    },
    function(identifier, profile, done) {
      console.log("profile: " + JSON.stringify(profile)); //{"displayName":"Wen Xin","emails":[{"value":"e0052753@u.nus.edu"}],"name":{"familyName":"","givenName":""}}
      console.log("identifier: " + identifier); //https://openid.nus.edu.sg/e0052753
      profile.NusNetsID = identifier.split("/")[3];
      return done(null, profile);
    // #for further usage
    // User.findOrCreate({ openId: identifier }, function(err, user) {
    //    var usero = new User();
    //    usero.email = profile.email,
    //    usero.nickname = profile.nickname;
    //    done(err, usero);
    //  });
    }
  ));
}


