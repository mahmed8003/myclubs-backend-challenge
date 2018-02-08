const ACL = require("../auth/ACL");
const Formats = require("../lib/formats");
const moment = require("moment");
import ApiError from "../lib/apiError";

const CLASS_NAME = "UserFeedback";
const TERM_CLASS_NAME = "UserFeedbackTerm";

const ERRORS = {
  ERROR: { code: 25000, message: "feedback error" },
  USER_REQUIRED: { code: 25001, message: "user is required" },
  BOOKING_REQUIRED: { code: 25002, message: "booking id is required" },
  FEEDBACK_ALREADY_PROVIDED: {
    code: 25003,
    message: "feedback has already been provided"
  },
  VALUE_REQUIRED: { code: 25004, message: "value is required" },
  BOOKING_NOT_FOUND: { code: 25005, message: "booking  not found" },
  FEEDBACK_NOT_FOUND: { code: 25006, message: "feedbacks not found" }
};

class FeedbackService {
  constructor(options) {
    this.auth = options.auth;
    this.dataStore = options.dataStore;
  }
  submit = async options => {
    return submit(this.dataStore, options);
  };
  getTerms = async options => {
    return getTerms(this.dataStore, options);
  };
  getRequired = async options => {
    return getRequired(this.dataStore, options);
  };
}

/*

    get all active bookings without feedback

*/

const getLastBooking = async (dataStore, { user }) => {
  const userPtr = {
    __type: "Pointer",
    className: "_User",
    objectId: user.objectId
  };
  const query = {
    member: userPtr,
    status: "active",
    // this is not ideal but since some bookings don't have end time there is no better way
    start: { $lt: Formats.parseDate(moment().subtract(2, "hours")) }
  };
  const { results } = await dataStore.query(
    { type: "Booking", order: "-start", limit: 1, include: "partner,activity" },
    query
  );
  return results[0];
};
/*
  connect booking and feedback via pointers
*/
const connectBooking = async (dataStore, { feedback, bookingId }) => {
  const feedbackPtr = {
    __type: "Pointer",
    className: CLASS_NAME,
    objectId: feedback.objectId
  };
  const booking = await dataStore.getOne("Booking", bookingId);
  booking.feedback = feedbackPtr;

  const res = await dataStore.save("Booking", booking);

  return booking;
};
/*
  get bookings for which the user needs to provide feedback
*/
const getRequired = async (dataStore, { user }) => {
  const booking = await getLastBooking(dataStore, { user });
  if (!booking || booking.feedback) {
    return [];
  }
  return [booking];
};

const submit = async (
  dataStore,
  { user, bookingId, terms, source, comment, value }
) => {
  const feedback = await create(dataStore, {
    user,
    bookingId,
    terms,
    source,
    comment,
    value
  });
  const booking = await connectBooking(dataStore, { feedback, bookingId });

  return feedback;
};
/*
  should cap the value to a number between 0 - 5
*/
const capValue = value => {
  return Math.max(0, Math.min(5, Number(value)));
};
/*
  ensure only valid terms can be supplied
*/
const sanitizeTerms = async (dataStore, { terms, user, bookingId }) => {
  const activeTerms = await getTerms(dataStore, { user, bookingId });
  let validTerms = {};
  for (let key in terms) {
    let active = null;
    for (let i in activeTerms) {
      if (key === activeTerms[i].slug) {
        active = activeTerms[i];
      }
    }
    if (active) {
      validTerms[key] = capValue(terms[key]);
    }
  }
  return validTerms;
};
/*
  create a new feedback
*/
const create = async (
  dataStore,
  { user, bookingId, terms, source, comment, value }
) => {
  if (!bookingId) {
    throw new ApiError(ERRORS.BOOKING_REQUIRED);
  }
  if (isNaN(value)) {
    throw new ApiError(ERRORS.VALUE_REQUIRED);
  }

  const validTerms = await sanitizeTerms(dataStore, { terms, user, bookingId });
  const capedValue = capValue(value);
  const userPtr = {
    __type: "Pointer",
    className: "_User",
    objectId: user.objectId
  };
  const bookingPtr = {
    __type: "Pointer",
    className: "Booking",
    objectId: bookingId
  };
  const query = {
    user: userPtr,
    booking: bookingPtr
  };

  let [member, feedback] = await Promise.all([
    dataStore.getOne("_User", user.objectId),
    dataStore.query({ type: CLASS_NAME }, query)
  ]);
  if (feedback && feedback.results.length > 0) {
    throw new ApiError(ERRORS.FEEDBACK_ALREADY_PROVIDED);
  }

  const acl = ACL.createAdminACL();

  feedback = {
    user: userPtr,
    booking: bookingPtr,
    acl,
    value: capedValue,
    terms: validTerms,
    source,
    comment
  };
  feedback = await save(dataStore, feedback);

  return feedback;
};

/*
    TODO: refactor to use datastore.getOne with the activity include
*/
const getBooking = async (dataStore, bookingId) => {
  const { results } = await dataStore.query(
    { type: "Booking", include: "activity" },
    { objectId: bookingId }
  );
  return results[0];
};

/*
    get all active terms terms for a booking
*/
const getTerms = async (dataStore, { user, bookingId }) => {
  const booking = await getBooking(dataStore, bookingId);
  if (!booking) {
    throw new ApiError(ERRORS.BOOKING_NOT_FOUND);
  }
  const type = booking.activity.type;
  const { results } = await dataStore.query(
    { type: TERM_CLASS_NAME },
    { status: "active", type }
  );
  return results;
};

const save = async (dataStore, feedback) => {
  const res = await dataStore.save(CLASS_NAME, feedback);
  feedback.objectId = res.objectId;
  return feedback;
};

/*
    get the average rating a user has provided
*/
const getAverageUserRating = async (dataStore, userId) => {
  const userPtr = {
    __type: "Pointer",
    className: "_User",
    objectId: userId
  };

  const query = {
    user: userPtr
  };

  const { results } = await dataStore.query({ type: CLASS_NAME }, query);

  /*
  Why I didn't completed this way! 
  Because I belevice even if it lookd fancier but it will be hard on memory and processing. 
  - Filter function (clouser) returning a new array means extra memory consumption
  - Map function then again returning new array means extra memoru consumption
  - Reduce function 
  - Anonyms functions are hard to optimize for V8 engine
  const validFeedbacks = results.filter(feedback => feedback.hasOwnProperty('value'));
  if (validFeedbacks.length == 0) {
    throw new ApiError(ERRORS.FEEDBACK_NOT_FOUND);
  }

  const totalFeedbacksValue = validFeedbacks
    .map(feedback => feedback.value)
    .reduce((previousValue, currentValue) => previousValue + currentValue);

  const rating = Math.round( (totalFeedbacksValue / validFeedbacks.length) * 10) / 10;
  return {rating};
  */

  let totalValidFeedbacks = 0;
  let totalFeedbacksValue = 0;

  // This solution is simpler and much performant because in a single loop we are checking valid user feedbacks
  // and calculating required values
  for (let i = 0; i < results.length; i++) {
    const feedback = results[i];
    if (feedback.hasOwnProperty("value")) {
      totalValidFeedbacks++;
      totalFeedbacksValue += feedback.value;
    }
  }

  if (totalValidFeedbacks == 0) {
    throw new ApiError(ERRORS.FEEDBACK_NOT_FOUND);
  }

  const rating =
    Math.round(totalFeedbacksValue / totalValidFeedbacks * 10) / 10;
  return { rating };
};

module.exports = {
  FeedbackService,
  getTerms,
  sanitizeTerms,
  capValue,
  submit,
  getRequired,
  create,
  capValue,
  getAverageUserRating,
  ERRORS
};
