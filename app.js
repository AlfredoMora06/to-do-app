const express = require('express'),
      exphbs = require('express-handlebars'),
      path = require('path'),
      fs = require('fs'),
      bodyParser = require('body-parser'),
      axios = require('axios'),
      cookieParser = require('cookie-parser');

const app = express();

//express to use handlebars 
app.engine("handlebars",exphbs());
app.set("view engine", "handlebars");

// read data.json
var data = fs.readFileSync(path.join(__dirname, '/data.json'));
var jsondata = JSON.parse(data);

app.use(express.static(path.join(__dirname, 'views')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser("secret"));
app.use(cookieParser());

app.get('/', function(req, res) {
    res.render("home");
});

TODO_API_URL = "https://hunter-todo-api.herokuapp.com"; //USE OF HUNTER API

app.get("/register", function(req,res) {
    res.render("register");
});

app.post("/register", function(req, res) {
    axios.post(TODO_API_URL + '/user', {
        username: req.body.username_input
    })
    .then(function(response) {
        console.log(response);
    })
    .catch(function(error) {
        console.log(error);
    });

    res.render("home");
});

app.get("/login", function(req,res) {
    res.render("login");
});
// authentication -? having some errors when it comes to a user that does not exist
app.post("/login", async (req,res) => {

    try {
        const response = await axios.post(`${TODO_API_URL}/auth`, { username: req.body.username_input});
        res.cookie('Authentication', response.data.token, {
            signed: true,
            httpOnly: true
        });
        res.cookie('Username', req.body.username_input, {
            signed: true,
            httpOnly: true
        });
        res.redirect('user');
    } catch(err) {
        if (err.response.status === 404) {
          alert("User doesn't exist");
            res.render("error", {
                message: "User does not exist",
                error: {status:404}
            })
        }
        console.log(err);
    }

});

app.get('/user', async (req,res) => {
    // login to user's page
    var user = req.signedCookies.Username;
    res.render('user', {username: user})
});

//data for current user
app.get('/completelist', async (req,res) => {
    try {
        if (req.signedCookies.Authentication === undefined) {
            res.render('error', {
                message: "User is not authenticated."
            })
        }
        else {
            const response = await axios.get(TODO_API_URL + '/todo-item', {
                headers: {Cookie: `token=${req.signedCookies.Authentication}`}
            })

            var user = req.signedCookies.Username;

            res.render('completelist', {username: user, list: response.data})
        }

    } catch(err) {
        if (err.response.status === 404) {
			res.render("error", {
				message: "To-do list is empty",
				error: {status: 404}
			})
        }
    }
});

app.post("/newitem", async(req, res) => {
    try {
        if (req.signedCookies.Authentication === undefined) {
            res.render('error', {
                message: "User is not authenticated"
            });
        }
        else {
            await axios({
                method: "POST",
                url: TODO_API_URL + '/todo-item',
                headers: {
                    Cookie: `token=${req.signedCookies.Authentication}`
                },
                data: {
                    content: req.body.todo_input
                }
            })
            res.redirect('completelist');
        }
    } catch(err) {
        console.log(err);
    }
});

// delete a particular item with id 123
app.post("/:id/delete", async(req,res)=>{
	try {
		if (req.signedCookies === undefined) {
			res.render("error", {message: "Error. User not authenticated."});
		} else {
			await axios.delete(`${TODO_API_URL}/todo-item/${req.params.id}`, {
				headers: {
					Cookie: `token=${req.signedCookies.Authentication}`
				}
            });
            console.log("Item has been succesfully deleted");
			res.redirect("/completelist");
		}
	} catch (err) {
		console.log(err);
	}
})

// Update a particular todo item with id 123 to be completed under the currently authenticated user
app.post("/:id/update", async(req,res)=>{
	try {
		if (req.signedCookies === undefined) {
			res.render("error", {message: "Error. User not authenticated."});
		} else {
            await axios({
                method: "PUT",
                url: `${TODO_API_URL}/todo-item/${req.params.id}`,
                headers: {
                    Cookie: `token=${req.signedCookies.Authentication}`
                },
                data: {
                    completed: true
                }
            })
            console.log("Item completed");
			res.redirect("/completelist");
		}
	} catch (err) {
		console.log(err);
	}
})

app.get('/logout', async (req,res)=> {
    try {
        res.clearCookie('Authentication');
        res.clearCookie('Username');
        res.redirect('/');
        console.log("Successfully logged out");
    } catch(err) {
        console.log(err);
    }
});

app.listen(8080);
