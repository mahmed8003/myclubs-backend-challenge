import Formats from "../../src/lib/formats";
import moment from "moment";

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

module.exports = DATA;
