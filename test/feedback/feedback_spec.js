"use strict";
const should = require("should");
const {
  FeedbackService,
  submit,
  getTerms,
  getRequired,
  create,
  getAverageUserRating,
  ERRORS
} = require("../../src/feedback/feedback");

const Formats = require("../../src/lib/formats");
const DataStore = require("../mocks/dataStore");
import moment from "moment";
import _ from "lodash";

describe("feedback", () => {
  const USER_PTR = {
    objectId: "userID",
    __type: "Pointer",
    className: "_User"
  };
  const COURSE_PTR = {
    objectId: "courseID",
    __type: "Pointer",
    className: "Activity"
  };
  const INFRA_PTR = {
    objectId: "infraID",
    __type: "Pointer",
    className: "Activity"
  };
  const PARTNER_PTR = {
    objectId: "partnerID",
    __type: "Pointer",
    className: "Partner"
  };
  const DATA = {
    _User: {
      userID: { objectId: "userID" }
    },
    Activity: {
      courseID: { status: "active", type: "course", objectId: "courseID" },
      infraID: { status: "active", type: "infrastructure", objectId: "infraID" }
    },
    Partner: {
      partnerID: { objectId: "partnerID", name: "partner name" }
    },
    Booking: {
      bookingID1: {
        partner: PARTNER_PTR,
        activity: COURSE_PTR,
        status: "active",
        member: USER_PTR,
        objectId: "bookingID1",
        start: Formats.parseDate(moment().subtract(2, "days"))
      },
      bookingID2: {
        partner: PARTNER_PTR,
        activity: COURSE_PTR,
        status: "active",
        member: USER_PTR,
        objectId: "bookingID2",
        start: Formats.parseDate(moment().subtract(2, "weeks"))
      },
      bookingID3: {
        partner: PARTNER_PTR,
        activity: COURSE_PTR,
        status: "active",
        member: USER_PTR,
        objectId: "bookingID3",
        start: Formats.parseDate(moment().subtract(4, "days")),
        feedback: { objectId: "feedbackID" }
      },
      bookingID4: {
        partner: PARTNER_PTR,
        activity: COURSE_PTR,
        status: "reservation",
        member: USER_PTR,
        objectId: "bookingID4",
        start: Formats.parseDate(moment().add(1, "week"))
      },
      bookingID5: {
        partner: PARTNER_PTR,
        activity: INFRA_PTR,
        status: "active",
        member: USER_PTR,
        objectId: "bookingID5",
        start: Formats.parseDate(moment().add(2, "days"))
      }
    },
    UserFeedback: {
      feedbackID: {
        objectId: "feedbackID",
        booking: {
          objectId: "bookingID3",
          __type: "Pointer",
          className: "Booking"
        },
        user: USER_PTR
      },
      feedbackID2: {
        objectId: "feedbackID2",
        booking: {
          objectId: "bookingID4",
          __type: "Pointer",
          className: "Booking"
        },
        value: 5,
        user: USER_PTR
      },
      feedbackID3: {
        objectId: "feedbackID3",
        booking: {
          objectId: "bookingID4",
          __type: "Pointer",
          className: "Booking"
        },
        value: 4,
        user: USER_PTR
      },
      feedbackID4: {
        objectId: "feedbackID4",
        booking: {
          objectId: "bookingID4",
          __type: "Pointer",
          className: "Booking"
        },
        value: 3,
        user: USER_PTR
      }
    },
    UserFeedbackTerm: {
      feedbackTermID: {
        objectId: "feedbackTermID",
        slug: "term1",
        status: "active",
        type: "course"
      },
      feedbackTermID2: {
        objectId: "feedbackTermID2",
        slug: "term2",
        status: "draft",
        type: "course"
      },
      feedbackTermID3: {
        objectId: "feedbackTermID3",
        slug: "term3",
        status: "active",
        type: "course"
      },
      feedbackTermID4: {
        objectId: "feedbackTermID4",
        slug: "term3",
        status: "active",
        type: "infrastructure"
      },
      feedbackTermID5: {
        objectId: "feedbackTermID5",
        slug: "term3",
        status: "active",
        type: "infrastructure"
      }
    }
  };

  describe("constructor", () => {
    it("should create a new instance", () => {
      const feedback = new FeedbackService({});
      feedback.should.be.ok;
    });
  });
  describe("getTerms", () => {
    it("should return all active terms for a course booking", async () => {
      const dataStore = new DataStore({ data: DATA });
      const termList = await getTerms(dataStore, {
        user: { objectId: "userID" },
        bookingId: "bookingID1"
      });
      termList.length.should.equal(2);
      termList[0].objectId.should.equal("feedbackTermID");
    });
    it("should return all active terms for a infrastructure booking", async () => {
      const dataStore = new DataStore({ data: DATA });
      const termList = await getTerms(dataStore, {
        user: { objectId: "userID" },
        bookingId: "bookingID5"
      });
      termList.length.should.equal(2);
      termList[0].objectId.should.equal("feedbackTermID4");
    });
  });
  describe("getRequired", () => {
    it("should return the last booking if a user has never provided feedback", async () => {
      const dataStore = new DataStore({ data: DATA });
      const bookings = await getRequired(dataStore, {
        user: { objectId: "userID" }
      });
      bookings.length.should.equal(1);
      bookings[0].objectId.should.equal("bookingID1");
    });
    it("should return an empty array if feedback has been provided for the last booking", async () => {
      const data = _.cloneDeep(DATA);
      delete data.Booking.bookingID1;
      delete data.Booking.bookingID2;

      const dataStore = new DataStore({ data: data });
      const bookings = await getRequired(dataStore, {
        user: { objectId: "userID" }
      });
      bookings.length.should.equal(0);
    });
    it("should only return bookings after the booking is complete", async () => {
      const data = _.cloneDeep(DATA);
      delete data.Booking.bookingID1;
      delete data.Booking.bookingID2;
      delete data.Booking.bookingID3;
      delete data.Booking.bookingID4;

      const dataStore = new DataStore({ data: data });
      const bookings = await getRequired(dataStore, {
        user: { objectId: "userID" }
      });
      bookings.length.should.equal(0);
    });
  });
  describe("submit", () => {
    it("should create a feedback and connect it to a booking", async () => {
      const data = _.cloneDeep(DATA);
      const dataStore = new DataStore({ data });

      const payload = {
        value: 5,
        bookingId: "bookingID1",
        terms: { term1: 5 },
        user: { __type: "Pointer", className: "_User", objectId: "userID" }
      };

      const feedback = await submit(dataStore, payload);
      data.Booking.bookingID1.feedback.objectId.should.equal(feedback.objectId);
    });
  });
  describe("sanitizeTerms", () => {
    // TODO: unit test this method
    it("should filter invalid terms", async () => {
      // TODO: implement me
    });
    it("should only allow values between 0 - 5", async () => {
      // TODO: implement me
    });
  });
  describe("create", () => {
    it("should allow a rating of 0", async () => {
      const data = _.cloneDeep(DATA);
      const dataStore = new DataStore({ data });
      const payload = {
        value: 0,
        bookingId: "bookingID1",
        terms: { term1: 10 },
        user: { __type: "Pointer", className: "_User", objectId: "userID" }
      };
      const feedback = await create(dataStore, payload);

      feedback.value.should.equal(0);
    });

    it("should allow string ratings for erroneous clients", async () => {
      const data = _.cloneDeep(DATA);
      const dataStore = new DataStore({ data });
      const payload = {
        value: "0",
        bookingId: "bookingID1",
        terms: { term1: 10 },
        user: { __type: "Pointer", className: "_User", objectId: "userID" }
      };
      const feedback = await create(dataStore, payload);

      feedback.value.should.equal(0);
    });
    it("should fail if the user is not provied", async () => {
      const dataStore = new DataStore({ data: DATA });
      const payload = {
        value: 5,
        bookingId: "bookingID1",
        terms: { term1: 5 }
      };
      try {
        const feedback = await create(dataStore, payload);
        should.not.exist(feedback);
      } catch (e) {
        e.code.should.equal(ERRORS.USER_REQUIRED.code);
      }
    });
    it("should fail if the bookingId is not provided", async () => {
      const data = _.cloneDeep(DATA);
      const dataStore = new DataStore({ data });
      const payload = {
        value: 5,
        terms: { term1: 5 },
        user: { __type: "Pointer", className: "_User", objectId: "userID" }
      };
      try {
        const feedback = await create(dataStore, payload);
        should.not.exist(feedback);
      } catch (e) {
        e.code.should.equal(ERRORS.BOOKING_REQUIRED.code);
      }
    });
    it("should fail if no value is provided", async () => {
      const data = _.cloneDeep(DATA);
      const dataStore = new DataStore({ data });
      const payload = {
        terms: { term1: 5 },
        bookingId: "bookingID1",
        user: { __type: "Pointer", className: "_User", objectId: "userID" }
      };
      try {
        const feedback = await create(dataStore, payload);
        should.not.exist(feedback);
      } catch (e) {
        e.code.should.equal(ERRORS.VALUE_REQUIRED.code);
      }
    });

    it("should fail if the user has already created a feedback for this specific booking", async () => {
      const data = _.cloneDeep(DATA);
      const dataStore = new DataStore({ data });
      const payload = {
        value: 5,
        terms: { term1: 5 },
        bookingId: "bookingID3",
        user: { __type: "Pointer", className: "_User", objectId: "userID" }
      };
      try {
        const feedback = await create(dataStore, payload);
        should.not.exist(feedback);
      } catch (e) {
        e.code.should.equal(ERRORS.FEEDBACK_ALREADY_PROVIDED.code);
      }
    });

    it("should create a feedback object with terms and a comment", async () => {
      const data = _.cloneDeep(DATA);
      const dataStore = new DataStore({ data });
      const payload = {
        value: 4,
        terms: { term1: 4, term3: 4 },
        bookingId: "bookingID1",
        user: { __type: "Pointer", className: "_User", objectId: "userID" },
        comment: "test comment"
      };
      const feedback = await create(dataStore, payload);
      feedback.value.should.equal(payload.value);
      feedback.terms.should.deepEqual(payload.terms);
      feedback.booking.objectId.should.equal(payload.bookingId);
      feedback.user.objectId.should.equal(payload.user.objectId);
      feedback.comment.should.equal(payload.comment);
    });

    it("should calculate user average ratings", async () => {
      const data = _.cloneDeep(DATA);
      const dataStore = new DataStore({ data });
      const value = await getAverageUserRating(dataStore, "userID");
      should.exist(value);
      should.exist(value.rating);
      value.rating.should.equal(4);
    });

    it("should fail if user feebacks doesn't exists while calculate user average ratings", async () => {
      const data = _.cloneDeep(DATA);
      const dataStore = new DataStore({ data });
      try {
        const value = await getAverageUserRating(dataStore, "userID-XYZ");
        should.not.exist(value);
      } catch (e) {
        e.code.should.equal(ERRORS.FEEDBACK_NOT_FOUND.code);
      }
    });
  });
});
