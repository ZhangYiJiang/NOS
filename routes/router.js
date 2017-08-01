
var db = require('../config/db');
var db_manager = new db();

var db_use = require('../config/db_user');
var db_user = new db_use();

var db_boo = require("../config/db_groupBooking");
var db_book = new db_boo();

var t = require('../config/token');
var db_token = new t();

var cool = require('cool-ascii-faces');

//套路：
	// db_user.hasUserRegistered(req.user.displayName, req.user.NusNetsID, req.user.emails[0].value, function(name, id, email, boo) {
 //      if (boo == true) {
 //        //registered 
 //        db_user.getUserGroup(req.user.displayName, req.user.NusNetsID, function(idd, grp, bool) {
 //          if (bool == true) {
 //            //in a group.
 //            res.redirect('/viewBooking');
 //          } else {
 //          	//not in a group
 //            //res....
 //          }
 //        });
 //      } else {
 //      	//not registered
 //        res.redirect('/register');
 //      }
 //    });

isLoggedIn = function (req,res,next) {
  if(req.isAuthenticated()){
    // console.log("1111111111((((($$$$$$$$$$$@@@@@@@@@@@@!!!!!!!!!!!!!!----------------------------------------------------------------------");
    // console.log(req);
    // console.log("2222222222((((($$$$$$$$$$$@@@@@@@@@@@@!!!!!!!!!!!!!!----------------------------------------------------------------------");    
    db_user.isUserFromRVRC(req.user.NusNetsID, req.user.displayName, function(id, name, boo) {
      if(boo == true) {
        return next();
      } else {
        console.log(name + " is not from RVRC! redirected to login page");
        res.redirect('/');
      }
    });
  } else {
    res.redirect('/');
  }
}

module.exports = function (app,passport) {
  app.get('/',function (req,res) {
  	res.render('index.ejs',{ title : "Welcome to RVRC Room Booking System"});
  });  

  app.get('/logout', function (req,res) {
  	req.logout();
  	res.redirect('/');
  });

  app.get('/auth/openid', passport.authenticate('openid'));

  app.get('/auth/openid/return',passport.authenticate('openid', 
      { successRedirect: '/viewBooking',
        failureRedirect: '/' }));

  // routes 
  app.get('/cool', function(req, res) {
    res.send(cool());
  })

  app.get('/info', function(req, res) {
    db_book.allBookedTimeslotsFor5Days(function(arrBooked) {
      db_book.allTimeslotsFor5Days(function(arrAll) {
        if (JSON.stringify(req.user) == undefined) {
          //info.ejs
          res.render('info.ejs', 
                      {profile:{displayName:"Guest"}, 
                      allTimeslots: arrAll, 
                      userBooking:[false,false,false,false,false], 
                      userGroup:null, 
                      bookedTimeslot:arrBooked}
          );
        } else {
          //check if the user has a grp or what to make sure the group's booking state
          db_user.getUserGroup(req.user.displayName, req.user.NusNetsID, function(id, grpid, boo) {
            if (boo == false) {
              //doesnt hv a group
              //info.ejs
              res.render('info.ejs', 
                      {profile:req.user, 
                      allTimeslots: arrAll, 
                      userBooking:[false,false,false,false,false],
                      userGroup:null, 
                      bookedTimeslot:arrBooked}
              );
            } else {
              //has a group, check if the group made any booking. 
              db_book.hasGroupBookedAnyFor5Days(grpid, function(arrOfBoo) {
                //info.ejs
                res.render('info.ejs', 
                      {profile:req.user, 
                      allTimeslots: arrAll, 
                      userBooking:arrOfBoo, 
                      userGroup:grpid, 
                      bookedTimeslot:arrBooked}
                );
              })
            }
          })
        }
      })
    })
  })

  app.get('/viewBooking', isLoggedIn, function(req, res) {
    db_user.hasUserRegistered(req.user.displayName, req.user.NusNetsID, req.user.emails[0].value, function(name, id, email, boo) {
      if (boo == true) {
      	//user is registered, check if she changed her email
      	db_user.updateUserEmail(req.user.displayName, req.user.NusNetsID, req.user.emails[0].value, function(boo) {
      		//user is registered, check if in a group
	      	db_user.getUserGroup(name, id, function(idd, resul, bool) {
	          if (bool == true) {
	            //user in a group, check if group is complete
	            db_user.IfGroupComplete(resul, function(grpid, booln) {
	              if (booln == true) {
	                //group is complete, allow viewing group booking schedule
	                db_book.groupBookingStateFor5Days(grpid, function(schedule) {
	                  res.render("viewInfoByName.ejs", 
	                              {profile:req.user,
	                                groupID:grpid,
	                               schedule:schedule}
	  // [["2017-7-20"],
	  // ["2017-7-21"],
	  // ["2017-7-22"],
	  // ["2017-7-23",{"GROUPNAME":"moguempire","ROOMNUMBER":"103","DATE":"2017-07-22T16:00:00.000Z","SLOTSTART":"08:00:00","SLOTEND":"10:00:00","DECISIONTIME":"2017-07-20T01:53:54.000Z"}],
	  // ["2017-7-24"]]
	                  );
	                })
	              } else {
	                //group is incomplete, redirect to manageRegister to ask invite member
	                res.redirect('/manageRegister');
	              }
	            })
	          } else {
	            //user not in a group, redirect to manageRegister to let him choose to start a group or join a group
	            res.redirect('/manageRegister');
	          }
	        })	
      	})  
      } else {
        //user is not registered, redirect to register
        res.redirect('/register');
      }
    })
  })

  app.get("/register", isLoggedIn, function(req, res) {
    db_user.hasUserRegistered(req.user.displayName, req.user.NusNetsID, req.user.emails[0].value, function(name, id, email, boo) {
      if (boo == true) {
        res.redirect("/manageRegister");
      } else if (boo == false) {
        res.render("register.ejs", {profile:req.user});
      }
    });
  });

  app.post("/viewRegister", isLoggedIn, function(req, res) {
    db_user.hasUserRegistered(req.user.displayName, req.user.NusNetsID, req.user.emails[0].value, function(name, id, email, boo) {
      if (boo == true) {
        //user is registered. check if the user has a group
        db_user.getUserGroup(req.user.displayName, req.user.NusNetsID, function(id, grpname, booo) {
          if (booo == true) { //user has a group
            res.redirect('/viewBooking');
          } else if (booo == false) { //user doesnt have a group
            res.redirect('/manageRegister'); 
          }
        });
      } else if (boo == false) {//user is not registered. Register him into the system
        db_user.addUserToUserInfo(req.user.displayName, req.user.NusNetsID, req.user.emails[0].value, function(namme, idd, emaill, booll) {
            console.log("adding user--booll == " + booll);
            res.redirect('/manageRegister');
        });
      }
    });
  });

  app.get('/manageRegister', isLoggedIn, function(req, res) {
    db_user.hasUserRegistered(req.user.displayName, req.user.NusNetsID, req.user.emails[0].value, function(name, id, email, boo) {
      if (boo == true) {
        db_user.getUserGroup(req.user.displayName, req.user.NusNetsID, function(id, grpid, booo) {
          if (booo == true) {
            db_user.whichMemberSlotEmpty(grpid, function(arrOrNull) {
            	if(arrOrNull.length == 0) {
            		//group full. no one can add in anymore.
            		res.render('manageRegister.ejs', 
                           {profile:req.user, 
                            groupID:grpid, 
                            inviteButton:false, 
                            dismissButton:true,
                            JoinButton:false,
                            StartButton:false});
            	} else if (arrOrNull.length > 0) {
            		//group not full. can add in more
            		res.render('manageRegister.ejs', 
                           {profile:req.user, 
                            groupID:grpid, 
                            inviteButton:true, 
                            dismissButton:true,
                            JoinButton:false,
                            StartButton:false});
            	} 
            })
          } else if (booo == false) {
            //doesnt have a group
            res.render('manageRegister.ejs', 
                       {profile:req.user,
                        groupID:false,
                        inviteButton:false,
                        dismissButton:false,
                        JoinButton:true,
                        StartButton:true});
          }
        });      
      } else if (boo == false) {
        res.redirect('/register');
      }
    })
  })

  app.get("/startAGroup", isLoggedIn, function(req, res) {
    //check if this guy is registered first then if is in a grp 
    db_user.hasUserRegistered(req.user.displayName, req.user.NusNetsID, req.user.emails[0].value, function(name, id, email, boo) {
      if (boo == true) {
        //registered check grp
        db_user.getUserGroup(req.user.displayName, req.user.NusNetsID, function(idd, grp, booo) {
          if (booo == true) {
            //in a group.
            res.redirect('/viewBooking');
            db_user.IfGroupComplete(grpid, function(groupid, bool) {
              if (bool == true) {
                //group is complete, direct to viewBooking
                res.redirect('/viewBooking');
              } else {
                //group is incomplete. stay on this page.
                //redirect to manageRegister
                res.redirect('/manageRegister'); 
              }
            });
          } else if (booo == false) {
            //doesnt have a group
            res.render('startAGroup.ejs', 
                       {profile:req.user,
                        groupID:false});
            //output to manageGroup in req.body: { groupname: 'wenxiaoxin',
                                                // member2ID: '1',
                                                // member2email: '1@.com',
                                                // member3ID: '2',
                                                // member3email: '2@.com',
                                                // member4ID: '3',
                                                // member4email: '3@.com',
                                                // member5ID: '',
                                                // member5email: '' }
          }
        });
      } else {
        res.redirect('/register');
      }
    });
  });

  app.get("/joinAGroup", isLoggedIn, function(req, res) {
        //check if this guy is registered first then if is in a grp 
    db_user.hasUserRegistered(req.user.displayName, req.user.NusNetsID, req.user.emails[0].value, function(name, id, email, boo) {
      if (boo == true) {
        //registered check grp
        db_user.getUserGroup(req.user.displayName, req.user.NusNetsID, function(idd, grp, bool) {
          if (bool == true) {
            //in a group.
            res.redirect('/viewBooking');
          } else {
            //not in a group
            res.render('joinAGroup.ejs', {profile:req.user});
            //output to /manageGroup in req.body: { usergroupID: '1701', usertoken: 'asdfasdf' }
          }
        });
      } else {
        res.redirect('/register');
      }
    });
  });


  //receive data from startAGroup and joinAGroup
  //if it's start group, add userID, grpID, token to a table, send email;
  //if it's join group, check if its in table, if it is, add into the group, delete from the table. 
  app.post('/manageGroup', isLoggedIn, function(req, res) {
          //check if this guy is registered first then if is in a grp 
          // console.log("@#$@$@#$@#$@#$@#$@#$@#$@#$@#$@#$@#$@$@#$");
          // console.log(req);
    db_user.hasUserRegistered(req.user.displayName, req.user.NusNetsID, req.user.emails[0].value, function(name, id, email, boo) {
      if (boo == true) {
        //registered 
        db_user.getUserGroup(req.user.displayName, req.user.NusNetsID, function(idd, grp, bool) {
          if (bool == true) {
            //in a group.
            res.redirect('/viewBooking');
          } else {
          	//not in a group
            //res...
            if (req.body.usergroupID == undefined) {
            	//data come from startAGroup
            	//add the req.user into group_info, add groupId to userinfo, generate a GroupID, and give her the groupID.
            	db_user.registerGroup(req.body.groupname, req.user.NusNetsID, function(grpname, grpid) {
            		//pass out grpname and grpid, used in render
            		//now generate token and send email to the rest of them
            		db_user.addGroupToUserInfo(grpid, req.user.NusNetsID, req.user.displayName, function(trueOrFalse) {
            			if (trueOrFalse == true) {
            				//continue to create token.
		            		if (req.body.member5ID == "") {
		            			//ignore 5th member
		            			db_token.createTokenForSomePpl(req.user.displayName, 
		            									   [req.body.member2ID, req.body.member3ID, req.body.member4ID],
		            									   [req.body.member2email, req.body.member3email, req.body.member4email],
		            									   grpid,
		            									   function(boo) {
		            									   	if(boo == true) {
		            									   		res.render('manageGroup.ejs', 
		            									   				   {profile:req.user, 
		            									   				   	notified:true, 
		            									   				   	mailList:[req.body.member2email, req.body.member3email, req.body.member4email]
		            									   				   });
		            									   	}
		            									   });
		            		} else {
		            			//send email also to the 5th member
		            			db_token.createTokenForSomePpl(req.user.displayName,
		            									   [req.body.member2ID, req.body.member3ID, req.body.member4ID, req.body.member5ID],
		            									   [req.body.member2email, req.body.member3email, req.body.member4email, req.body.member5email],
		            									   grpid,
		            									   function(boo) {
		            									   	if(boo == true) {
		            									   		res.render('manageGroup.ejs', 
		            									   					{profile:req.user, 
		            									   					notified:true,
		            									   					mailList:[req.body.member2email, req.body.member3email, req.body.member4email, req.body.member5email]
		            									   					});
		            									   	}
		            									   });
		            		}
            			}
            		})
            		
            	});
            } else {
            	//data come from joinAGroup
            	//authenticate first
            	db_token.checkIfTokenMatch(req.body.usergroupID, req.user.NusNetsID, req.body.usertoken, function(grupid, netsid, token, boolin) {
            		if (boolin == true) {
            			//pass token check. add to groupinfo and userinfo
            			db_user.registerID(grupid, netsid, function(gid, nid, bullin) { 
            				if (bullin == false) {
            					//either group is full or this id is alr registered. ask them to check with their fren or contact admin. 
            					//give the email of the member 1 of this grpid
            					db_user.getGroupLeader(grupid, function(leaderid, leadername, leaderemail) {
            						res.render('manageGroup.ejs', {profile:req.user,
                                         success:null,
            													   groupID:gid,
            													   contactID: leaderid,
            													   contactName: leadername,
            													   contactEmail: leaderemail,
                                         mailList: undefined});
            					})
            				} else if (bullin == true) {
            					//registered! add into userinfo, render success. 
            					db_user.addGroupToUserInfo(gid, req.user.NusNetsID, req.user.displayName, function(bub) {
            						console.log(bub);
            						res.render('manageGroup.ejs', {profile:req.user, success:true, groupID:gid, groupExist:true, added:true, mailList: undefined});
            					})
            				} else if (bullin == null) {
            					//group does not exist. probably alr dismissed. 
            					//rener failure
            					res.render('manageGroup.ejs', {profile:req.user, success:false, groupID:gid, groupExist:false, added:false, mailList: undefined});
            				}
            			})
            		} else {
            			//fail token check. render page indicate failure
            			res.render('manageGroup.ejs', {profile:req.user, success:false, groupID:gid, tokenFailure:true});
            		}
            	})
            }
          }
        });
      } else {
      	//not registered
        res.redirect('/register');
      }
    });  
  });

  app.get('/inviteMembers', isLoggedIn, function(req, res) {
    db_user.hasUserRegistered(req.user.displayName, req.user.NusNetsID, req.user.emails[0].value, function(name, id, email, boo) {
      if (boo == true) {
        //registered 
        db_user.getUserGroup(req.user.displayName, req.user.NusNetsID, function(idd, grp, bool) {
          if (bool == true) {
            //in a group. //check if the group has other empty slots left. 
            db_user.whichMemberSlotEmpty(grp, function(nullOrArr) {
              if (nullOrArr == null) {
                //group does not exist
              } else {
                //group exist, and check if nullOrArr == []
                if (nullOrArr.length == 0) {
                  //group has 5 ppl. redirect to viewBooking
                  res.redirect('/viewBooking');
                } else {
                  //group is not full yet. render invite page.
                  res.render('inviteMembers.ejs', {profile:req.user, 
                                                   groupID:grp,
                                                   emptySlots:nullOrArr});
                }
              }
            });
          } else {
           //not in a group
            res.redirect('/manageRegister');
          }
        });
      } else {
       //not registered
        res.redirect('/register');
      }
    });
  })

  app.post('/manageInvite', isLoggedIn, function(req, res) {
    //send them emails and ask them to go to joinAGroup
    // console.log("laalalalallalalaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    // console.log(req.body);
    // console.log("finishhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh");
    // laalalalallalalaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
    // { member0ID: 'Me',
    //   member0email: 'e0052753@u.nus.edu',
    //   member1ID: '',
    //   member1email: '',
    //   member2ID: '',
    //   member2email: '' }
    // finishhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh
    db_user.getUserGroup(req.user.displayName, req.user.NusNetsID, function(idd, grp, bool) {
      if (bool == true) {
        //in a group. 
        var mailList = [];
        for (var i = 0; i < 6; i++) {
          if (i < 5) {
            //first 5 rounds. send emails first.
            if (req.body["member" + i + "email"] == "" || req.body["member" + i + "email"] == undefined) {
              ;
            } else {
              db_token.createTokenForSomePpl(req.user.displayName, 
                                             [req.body["member" + i + "ID"]], 
                                             [req.body["member" + i + 'email']], 
                                             grp, 
                                             function(boo) {
                if (boo == true) {
                  //all sent
                  mailList.concat([req.body["member" + i + 'email']]);
                  ;
                }
              })
            }
          } else {
            //last round, render the page.
            res.render('manageGroup.ejs', 
                                               {profile:req.user, 
                                                notified:true, 
                                                mailList:mailList
                                               });
          }
          
        } 
      } else {
       //not in a group
        res.redirect('/manageRegister');
      }
    });
  })

/*---------BOOKING AND CANCELLING FEATURES---------------------------------------------------------------------------*/

  app.get("/booking", isLoggedIn, function(req,res) {
  	///booking?room=101&timeslotstart=18&date=Tue%20Jul%2025%202017%2000:00:00%20GMT+0800%20(Malay%20Peninsula%20Standard%20Time)
  	if (req.url == "/booking") {
  		res.redirect('/info');
  	} else {
  		var roomnumber = req.url.split("&")[0].split('=')[1];
  		var timeslotstart = req.url.split("&")[1].split('=')[1];
  		var datestr = req.url.split("&")[2].split('=')[1].split('%20').slice(0,4).join(" ");
  		var timeslot = timeslotstart + "TO" + (parseInt(timeslotstart) + 2);
  		console.log(roomnumber);
  		console.log(timeslotstart);
  		console.log(datestr);
  		console.log(timeslot);
	  	db_user.hasUserRegistered(req.user.displayName, req.user.NusNetsID, req.user.emails[0].value, function(name, id, email, boo) {
	      if (boo == true) {
	        //registered 
	        db_user.getUserGroup(req.user.displayName, req.user.NusNetsID, function(idd, grp, bool) {
	          if (bool == true) {
	            //in a group. check if the group is complete
	            db_user.IfGroupComplete(grp, function(grpid, bu) {
	            	if (bu == true) {
	            		//group is complete
	            		res.render('bookingForm.ejs', {profile:req.user, groupID:grpid, roomnumber:roomnumber, date: datestr, timeslot:timeslot})
	            	} else if (bu == false) {
	            		//group is incomplete
	            		res.redirect('/manageRegister');
	            	} else if (bu == null) {
	            		//group does not exist
	            		res.redirect('/manageRegister');
	            	}
	            })
	          } else {
	          	//not in a group
	            res.redirect('/manageRegister');
	          }
	        });
	      } else {
	      	//not registered
	        res.redirect('/register');
	      }
	    });
  	}
  })


  app.post('/manageBooking', isLoggedIn, function(req,res) {
  	db_user.hasUserRegistered(req.user.displayName, req.user.NusNetsID, req.user.emails[0].value, function(name, id, email, boo) {
      if (boo == true) {
        //registered 
        db_user.getUserGroup(req.user.displayName, req.user.NusNetsID, function(idd, grp, bool) {
          if (bool == true) {
            //in a group.
            db_user.IfGroupComplete(grp, function(grpid, bu) {
            	if (bu == true) {
            		//group is complete
            		console.log("headerrrrrrrrrrrrrrrrrrrrrr");
            		console.log(req.headers.referer); //http://localhost/booking?room=103&timeslotstart=10&date=Sun%20Jul%2023%202017%2000:00:00%20GMT+0800%20(Malay%20Peninsula%20Standard%20Time)
            		var roomnumber = req.headers.referer.split("&")[0].split('=')[1];
  				  		var timeslotstart = req.headers.referer.split("&")[1].split('=')[1];
  				  		var datestr = req.headers.referer.split("&")[2].split('=')[1].split('%20').slice(0,4).join(" ");
  				  		var timeslot = timeslotstart + "TO" + (parseInt(timeslotstart) + 2);
  				  		console.log(roomnumber);
  				  		console.log(timeslotstart);
  				  		console.log(datestr);
  				  		console.log(timeslot);
  				  		db_book.dateFormatFromReq(datestr, function(strWithSpace) {
            			db_book.groupBook(grpid, strWithSpace, roomnumber, timeslot, function(bulin) {
            				if (bulin == true) {
            					//booking made
            					var d = new Date();
            					res.render('manageBooking.ejs', {success:true, profile:req.user, groupID:grpid, roomnumber:roomnumber, date: datestr, timeslot:timeslot, decisionTime:d.toString(), timeslotstart:timeslotstart+":00:00"});
            					//and send emails to everyone in the group
/*trouble!!!!! solve groupBookNotify at db_groupBooking line 521, problem: obtainAllMemberEmailIter*/
            					db_book.groupBookNotify(req.user.displayName, grpid, roomnumber, timeslot, datestr);
            				} else if (bulin == false) {
            					//room occupied
            					res.render('manageBooking.ejs', {success:false, profile:req.user, groupID:grpid, roomnumber:roomnumber, date: datestr, timeslot:timeslot, decisionTime:d.toString()})
            				}
            			})
            		})
            	} else if (bu == false) {
            		//group is incomplete
            		res.redirect('/manageRegister');
            	} else if (bu == null) {
            		//group does not exist
            		res.redirect('/manageRegister');
            	}
	          })
          } else {
          	//not in a group
            res.redirect('/manageRegister');
          }
        });
      } else {
      	//not registered
        res.redirect('/register');
      }
    });	
  })
				
  app.get("/cancelBooking", isLoggedIn, function(req, res) {
  	if (req.url == "/cancelBooking") {
  		res.redirect('/info');
  	} else {
  		console.log("headddddddddddddddddddddddddddder");
  		console.log(req.headers.referer);
  		console.log('req.urlllllllllllllllllllllllllllllll');
  		console.log(req.url);
// headddddddddddddddddddddddddddder
// http://localhost/viewBooking
// req.urlllllllllllllllllllllllllllllll
// /cancelBooking?room=101&timeslotstart=16:00:00&date=2017-7-27

// headddddddddddddddddddddddddddder
// http://localhost/manageBooking
// req.urlllllllllllllllllllllllllllllll
// /cancelBooking?room=103&timeslotstart=10:00:00&date=Tue%20Jul%2025%202017
		var roomnumber = req.url.split("&")[0].split('=')[1];
  		var timeslotstart = req.url.split("&")[1].split('=')[1];
  		var timeslot = parseInt(timeslotstart) + "TO" + (parseInt(timeslotstart) + 2);
  		var dateFromViewBooking = req.url.split("&")[2].split("=")[1];
  		var dateFromManageBooking = req.url.split("&")[2].split("=")[1].split("%20").join(" ");
		if (req.headers.referer.split("/")[3] == 'viewBooking') {
			// deal with the date in url with hyphen format
			db_book.dateFormatFromHyphen(dateFromViewBooking, function(spacestr) {
				//with the date string passed to the rest.
				db_user.hasUserRegistered(req.user.displayName, req.user.NusNetsID, req.user.emails[0].value, function(name, id, email, boo) {
			      if (boo == true) {
			        //registered 
			        db_user.getUserGroup(req.user.displayName, req.user.NusNetsID, function(idd, grp, bool) {
			          if (bool == true) {
			            //in a group. check if the group is complete
			            db_user.IfGroupComplete(grp, function(grpid, bu) {
			            	if (bu == true) {
			            		//group is complete
			            		res.render('cancelBookingForm.ejs', {profile:req.user, groupID:grpid, roomnumber:roomnumber, date: spacestr, timeslot:timeslot})
			            	} else if (bu == false) {
			            		//group is incomplete
			            		res.redirect('/manageRegister');
			            	} else if (bu == null) {
			            		//group does not exist
			            		res.redirect('/manageRegister');
			            	}
			            })
			          } else {
			          	//not in a group
			            res.redirect('/manageRegister');
			          }
			        });
			      } else {
			      	//not registered
			        res.redirect('/register');
			      }
			    });		
			})
		} else if (req.headers.referer.split('/')[3] == 'manageBooking') {
			//deal with the date in url with original format
			db_book.dateFormatFromReq(dateFromManageBooking, function(weekstr) {
				//with the date string passed to the rest
				db_user.hasUserRegistered(req.user.displayName, req.user.NusNetsID, req.user.emails[0].value, function(name, id, email, boo) {
			      if (boo == true) {
			        //registered 
			        db_user.getUserGroup(req.user.displayName, req.user.NusNetsID, function(idd, grp, bool) {
			          if (bool == true) {
			            //in a group. check if the group is complete
			            db_user.IfGroupComplete(grp, function(grpid, bu) {
			            	if (bu == true) {
			            		//group is complete
			            		res.render('cancelBookingForm.ejs', {profile:req.user, groupID:grpid, roomnumber:roomnumber, date: weekstr, timeslot:timeslot})
			            	} else if (bu == false) {
			            		//group is incomplete
			            		res.redirect('/manageRegister');
			            	} else if (bu == null) {
			            		//group does not exist
			            		res.redirect('/manageRegister');
			            	}
			            })
			          } else {
			          	//not in a group
			            res.redirect('/manageRegister');
			          }
			        });
			      } else {
			      	//not registered
			        res.redirect('/register');
			      }
			    });	
			})
		}
  	}
  })

  app.post('/manageCancel', isLoggedIn, function(req,res) {
  	console.log("headers: " + req.headers.referer);
  	console.log("url: " + req.url);
  	console.log('body: ' + JSON.stringify(req.body));
  	var d = new Date();
// headers: http://localhost/cancelBooking?room=103&timeslotstart=10:00:00&date=2017-7-25
// url: /manageCancel
// body: {"reason":""}
	db_user.hasUserRegistered(req.user.displayName, req.user.NusNetsID, req.user.emails[0].value, function(name, id, email, boo) {
      if (boo == true) {
        //registered 
        db_user.getUserGroup(req.user.displayName, req.user.NusNetsID, function(idd, grp, bool) {
          if (bool == true) {
            //in a group.
              	var roomnumber = req.headers.referer.split("&")[0].split('=')[1];
  				var timeslotstart = req.headers.referer.split("&")[1].split('=')[1];
  				var datestr = req.headers.referer.split("&")[2].split("=")[1];
  				var timeslot = parseInt(timeslotstart) + "TO" + (parseInt(timeslotstart) + 2);
  				db_book.dateFormatFromHyphen(datestr, function(date) {
  					db_book.groupCancel(grp, date, roomnumber, timeslot, function(bulin) {
  						if (bulin == true) {
  							//cancel successfully, send them email
  							db_book.groupCancelNotify(req.user.displayName, grp, roomnumber, timeslot, date);
  							res.render('manageCancel.ejs', {success:true, profile:req.user, groupID:grp, roomnumber:roomnumber, date: datestr, timeslot:timeslot, decisionTime:d.toString(), timeslotstart:timeslotstart+":00:00"})
  						} else {
  							//cancellation failed
  							res.render('manageCancel.ejs', {success:false, profile:req.user, groupID:grp, roomnumber:roomnumber, date: datestr, timeslot:timeslot, decisionTime:d.toString(), timeslotstart:timeslotstart+":00:00"})
  						}
  					})
  				})
          } else {
          	//not in a group
            res.redirect('/manageRegister');
          }
        });
      } else {
      	//not registered
        res.redirect('/register');
      }
    });
  })

  app.post("/manageCancel", isLoggedIn, function (req,res) { //to the booking page, login to book a room
    db_manager.bookedRoomNumber(req.user.displayName, req.user.emails[0].value, function (result) {
      res.render("cancelBookingConfirm.ejs", {profile: req.user, rooms:result});
    })
  });
  



  // catch 404 and forward to error handler
  app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
  });
  
  // error handler
  app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};
  
    // render the error page
    res.status(err.status || 500);
    res.render('error');
  });	
}


