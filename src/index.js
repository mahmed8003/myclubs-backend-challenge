const port = process.env.PORT || 8080;

import { app, express } from "./app";
import { FeedbackService } from "./feedback/feedback";
import DataStore from "../test/mocks/dataStore";
import FeedbackController from "./feedback/feedbackController";
import DATA from "../test/mocks/dummy";

// dummy data for testing via http client
let dataStore;
if (process.env.NODE_ENV === "development") {
  dataStore = new DataStore({ data: DATA });
} else {
  dataStore = new DataStore({});
}

const feedback = new FeedbackService({ dataStore });
const feedbackController = new FeedbackController({ feedback });

const BASE = "/api/v1/";
app.use(BASE + "status/", function(req, res, next) {
  res.json({ status: "ok", env: process.env.NODE_ENV });
});
app.use(BASE + "feedback/", feedbackController.router);

console.log("starting app...");
app.listen(port);
console.log("App started ENV", process.env.NODE_ENV);
console.log("running on port", port);
