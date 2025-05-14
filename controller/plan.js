const Plan = require("../models/plans");
const Customer = require("../models/customer");
const AdminsModel = require("../models/admins");
const Notification = require("../models/notification");

const OrderProduct = require("../models/orderdetails");
// Utility function to calculate 30 days from the current date
// const getStartDate = () => {
//     const now = new Date();
//     if (now.getHours() >= 6) {
//         now.setDate(now.getDate() + 1); // Move to the next day if current time is past 6 AM
//     }
//     now.setHours(0, 0, 0, 0); // Reset time to midnight
//     return now;
// };

const calculateMonthlyDates = (start) => {
  const startDate = new Date(start);
  const dates = [];
  for (let i = 0; i < 30; i++) {
    const newDate = new Date(startDate);
    newDate.setDate(startDate.getDate() + i);
    dates.push(newDate);
  }
  return dates;
};

const calculateDailyDates = (start) => {
  const startDate = new Date(start);
  const dates = [];
  for (let i = 0; i < 90; i++) {
    const newDate = new Date(startDate);
    newDate.setDate(startDate.getDate() + i);
    dates.push(newDate);
  }
  return dates;
};

const calculateIntroductoryDates = (start) => {
  const startDate = new Date(start);
  const dates = [];
  for (let i = 0; i < 10; i++) {
    const newDate = new Date(startDate);
    newDate.setDate(startDate.getDate() + i);
    dates.push(newDate);
  }
  return dates;
};

// Create a new plan for a customer
exports.createPlan = async (req, res) => {
  const { customerId, planType, customDates, weeklyDays, startDate, interval } =
    req.body;

  try {
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    let planStartDate = startDate ? new Date(startDate) : new Date();

    const now = new Date();

    // Convert to today's date at 00:00 UTC
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // Set planStartDate to 00:00 UTC
    planStartDate.setUTCHours(0, 0, 0, 0);

    // Convert current local time to 24-hour format
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentSecond = now.getSeconds();

    // Target time = 3:42:30 AM
    const targetHour = 3;
    const targetMinute = 42;
    const targetSecond = 30;

    // Compare current time with 3:42:30 AM
    const isAfterTargetTime =
      currentHour > targetHour ||
      (currentHour === targetHour && currentMinute > targetMinute) ||
      (currentHour === targetHour &&
        currentMinute === targetMinute &&
        currentSecond > targetSecond);

    // If plan start is today AND current time is after 3:42 AM, move to tomorrow
    if (planStartDate.getTime() === today.getTime() && isAfterTargetTime) {
      planStartDate = new Date(today);
      planStartDate.setDate(today.getDate() + 1); // move to tomorrow
    }

    let dates = [];
    switch (planType) {
      case "daily":
        dates = calculateDailyDates(planStartDate); // Generate 90 days for daily plan
        break;

      case "custom":
        if (!customDates || !Array.isArray(customDates)) {
          return res.status(400).json({ message: "Invalid custom dates" });
        }
        dates = customDates.map((date) => new Date(date));
        break;

      case "weekly":
        if (!weeklyDays || !Array.isArray(weeklyDays)) {
          return res.status(400).json({ message: "Invalid weekly days" });
        }

        const startDates = new Date(planStartDate);
        const daysToGenerate = 90; // Generate for 90 days

        for (let day of weeklyDays) {
          let currentDate = new Date(planStartDate);
          let offset = (day - currentDate.getDay() + 7) % 7;
          currentDate.setDate(currentDate.getDate() + offset); // Move to the correct weekday

          while (
            currentDate <=
            new Date(startDates.getTime() + daysToGenerate * 86400000)
          ) {
            dates.push(new Date(currentDate)); // Add to the list
            currentDate.setDate(currentDate.getDate() + 7); // Move to next week
          }
        }

        // Sort the dates to ensure correct order
        dates.sort((a, b) => a - b);
        break;

      case "alternative":
        if (!startDate || !interval || typeof interval !== "number") {
          return res
            .status(400)
            .json({ message: "Invalid alternative plan details" });
        }

        let altStartDate = new Date(planStartDate);
        if (altStartDate.getHours() >= 6) {
          altStartDate.setDate(altStartDate.getDate() + 1);
        }
        altStartDate.setHours(0, 0, 0, 0);

        for (let i = 0; i < 15; i++) {
          let nextDate = new Date(altStartDate);
          nextDate.setDate(altStartDate.getDate() + i * interval);
          dates.push(nextDate);
        }
        break;

      case "monthly":
        dates = calculateMonthlyDates(planStartDate);
        break;

      case "introductory":
        dates = calculateIntroductoryDates(planStartDate);
        break;

      case "none":
        dates.push(planStartDate);
        break;

      default:
        return res.status(400).json({ message: "Invalid plan type" });
    }

    const newPlan = new Plan({
      customer: customerId,
      planType,
      dates,
    });

    await newPlan.save();

    //  notification creating

    const deliveryBoy = await AdminsModel.findOne({ route: customer.routeno });
  
     const messageCustomer = `🛒  New order created.`;


     const notificationCustomer = new Notification({
      customerId: customer._id,
      messageCustomer,
    });
    await notificationCustomer.save();

    const message = `🛒 ${customer.name} (Route ${customer.routeno}) placed a new order.`;

    const notification = new Notification({
      deliveryboyId: deliveryBoy._id,
      message,
    });
    await notification.save();

    res
      .status(201)
      .json({ message: "Plan created successfully", plan: newPlan });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get plans and customer details
exports.getPlans = async (req, res) => {
  try {
    const plans = await Plan.find().populate("customer");
    res.status(200).json(plans);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Stop a daily plan
exports.stopDailyPlan = async (req, res) => {
  const { planId } = req.params;
  const today = new Date(); // Get the current date

  try {
    const plan = await Plan.findById(planId);

    if (!plan) {
      return res.status(404).json({ message: "Plan not found" });
    }

    // Remove future dates (keep only dates up to today)
    const updatedDates = plan.dates.filter((date) => new Date(date) <= today);

    // Update the plan: set inactive and update dates
    plan.isActive = false;
    plan.dates = updatedDates;

    await plan.save();

    res
      .status(200)
      .json({ message: `${plan.planType} plan stopped successfully`, plan });

         const customer = await Customer.findById({_id: plan.customer});
   if (!customer) {
     return res.status(404).json({ message: "Customer not found" });
   }

   const deliveryBoy = await AdminsModel.findOne({ route: customer.routeno });

    const messageCustomer = `🛒 Plan stopped`;

   const notificationCustomer = new Notification({
     customerId: customer._id,
     messageCustomer,
   });
   await notificationCustomer.save();


   const message = `🛒 ${customer.name} (Route ${customer.routeno})  plan stopped`;

   const notification = new Notification({
     deliveryboyId: deliveryBoy._id,
     message,
   });
   await notification.save();


  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getPlansByCustomerId = async (req, res) => {
  const { customerId } = req.params;

  try {
    const plans = await Plan.find({ customer: customerId }).populate(
      "customer"
    );

    if (plans.length === 0) {
      return res
        .status(404)
        .json({ message: "No plans found for this customer" });
    }

    const updatedPlans = plans.map((plan) => {
      let dynamicDates = [];

      if (plan.planType === "daily" && plan.isActive) {
        const today = new Date();
        for (let i = 0; i < 30; i++) {
          const nextDate = new Date(today);
          nextDate.setDate(today.getDate() + i);
          dynamicDates.push({
            date: nextDate,
            isLeave: plan.leaves.some(
              (leave) => leave.toISOString() === nextDate.toISOString()
            ),
          });
        }
      }

      return {
        ...plan._doc,
        dynamicDates,
      };
    });

    res.status(200).json(updatedPlans);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};
exports.applyLeave = async (req, res) => {
  const { customerId, dates } = req.body; // Expecting an array of dates

  try {
    // Find all active plans for the customer
    const plans = await Plan.find({
      customer: customerId,
      isActive: true,
    });

    if (plans.length === 0) {
      return res
        .status(404)
        .json({ message: "No active plans found for this customer" });
    }

    // Convert incoming dates to Date objects with time set to midnight for consistent comparison
    const leaveDates = dates.map((date) => {
      const leaveDate = new Date(date);
      return leaveDate;
    });

    let updatedPlans = [];
    let updatedOrders = [];

    // Process each plan
    for (const plan of plans) {
      // For each leave date, check if it exists in the plan's dates array
      const relevantLeaveDates = leaveDates.filter((leaveDate) => {
        // Check if the leave date exists in the plan's dates array
        return plan.dates.some((planDate) => {
          // Compare dates by converting to ISO string and checking date portion
          const planDateString = new Date(planDate).toISOString().split("T")[0];
          const leaveDateString = leaveDate.toISOString().split("T")[0];
          return planDateString === leaveDateString;
        });
      });

      if (relevantLeaveDates.length > 0) {
        // Filter out dates that are already in the leaves array
        const newLeaveDates = relevantLeaveDates.filter(
          (leaveDate) =>
            !plan.leaves.some((existingLeave) => {
              // Compare dates by converting to ISO string and checking date portion
              const existingLeaveString = new Date(existingLeave)
                .toISOString()
                .split("T")[0];
              const leaveDateString = leaveDate.toISOString().split("T")[0];
              return existingLeaveString === leaveDateString;
            })
        );

        if (newLeaveDates.length > 0) {
          // Add new leave dates to this plan
          plan.leaves.push(...newLeaveDates);

          // Update dynamicDates if it exists
          if (plan.dynamicDates && plan.dynamicDates.length > 0) {
            newLeaveDates.forEach((leaveDate) => {
              const leaveDateString = leaveDate.toISOString().split("T")[0];

              plan.dynamicDates.forEach((dynamicDate) => {
                const dynamicDateString = new Date(dynamicDate.date)
                  .toISOString()
                  .split("T")[0];

                if (dynamicDateString === leaveDateString) {
                  dynamicDate.isLeave = true;
                }
              });
            });
          }

          await plan.save();
          updatedPlans.push(plan);

          // Now update the corresponding OrderProduct document
          const orders = await OrderProduct.find({
            customer: customerId,
            plan: plan._id,
            planisActive: true,
          });

          for (const order of orders) {
            let isOrderUpdated = false;

            // Update the selectedPlanDetails.dates array to mark leave dates
            if (order.selectedPlanDetails && order.selectedPlanDetails.dates) {
              newLeaveDates.forEach((leaveDate) => {
                const leaveDateString = leaveDate.toISOString().split("T")[0];

                order.selectedPlanDetails.dates.forEach((dateItem, index) => {
                  if (dateItem && dateItem.date) {
                    const dateItemString = new Date(dateItem.date)
                      .toISOString()
                      .split("T")[0];

                    if (dateItemString === leaveDateString) {
                      // Mark this date with "leave" status
                      order.selectedPlanDetails.dates[index].status = "leave";
                      isOrderUpdated = true;
                    }
                  }
                });
              });

              if (isOrderUpdated) {
                await order.save();
                updatedOrders.push(order);
              }
            }
          }
        }
      }
    }

    if (updatedPlans.length === 0) {
      return res.status(400).json({
        message:
          "No new leaves applied. Either the dates don't exist in any plan or leave is already applied for these dates.",
      });
    }
    // notification

    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    const deliveryBoy = await AdminsModel.findOne({ route: customer.routeno });
    
    
    const messageCustomer = `🛒 Applied for leave — affecting ${updatedPlans.length} plans and ${updatedOrders.length} orders.`;

      const notificationCustomer = new Notification({
      customerId: customer._id,
      messageCustomer,
    });
    await notificationCustomer.save();


    const message = `🛒 ${customer.name} (Route ${customer.routeno}) applied for leave — affecting ${updatedPlans.length} plans and ${updatedOrders.length} orders.`;

    const notification = new Notification({
      deliveryboyId: deliveryBoy._id,
      message,
    });
    await notification.save();

    res.status(200).json({
      message: `Leave applied successfully across ${updatedPlans.length} plans and ${updatedOrders.length} orders`,
      updatedPlans,
      updatedOrders,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};
//original
// exports.applyLeave = async (req, res) => {
//     const { customerId, dates } = req.body; // Expecting an array of dates

//     try {
//         // Find all active plans for the customer
//         const plans = await Plan.find({
//             customer: customerId,
//             isActive: true
//         });

//         if (plans.length === 0) {
//             return res.status(404).json({ message: "No active plans found for this customer" });
//         }

//         // Convert incoming dates to Date objects with time set to midnight for consistent comparison
//         const leaveDates = dates.map(date => {
//             const leaveDate = new Date(date);
//             return leaveDate;
//         });

//         let updatedPlans = [];

//         // Process each plan
//         for (const plan of plans) {
//             // For each leave date, check if it exists in the plan's dates array
//             const relevantLeaveDates = leaveDates.filter(leaveDate => {
//                 // Check if the leave date exists in the plan's dates array
//                 return plan.dates.some(planDate => {
//                     // Compare dates by converting to ISO string and checking date portion
//                     const planDateString = new Date(planDate).toISOString().split('T')[0];
//                     const leaveDateString = leaveDate.toISOString().split('T')[0];
//                     return planDateString === leaveDateString;
//                 });
//             });

//             if (relevantLeaveDates.length > 0) {
//                 // Filter out dates that are already in the leaves array
//                 const newLeaveDates = relevantLeaveDates.filter(
//                     leaveDate => !plan.leaves.some(existingLeave => {
//                         // Compare dates by converting to ISO string and checking date portion
//                         const existingLeaveString = new Date(existingLeave).toISOString().split('T')[0];
//                         const leaveDateString = leaveDate.toISOString().split('T')[0];
//                         return existingLeaveString === leaveDateString;
//                     })
//                 );

//                 if (newLeaveDates.length > 0) {
//                     // Add new leave dates to this plan
//                     plan.leaves.push(...newLeaveDates);

//                     // Update dynamicDates if it exists
//                     if (plan.dynamicDates && plan.dynamicDates.length > 0) {
//                         newLeaveDates.forEach(leaveDate => {
//                             const leaveDateString = leaveDate.toISOString().split('T')[0];

//                             plan.dynamicDates.forEach(dynamicDate => {
//                                 const dynamicDateString = new Date(dynamicDate.date).toISOString().split('T')[0];

//                                 if (dynamicDateString === leaveDateString) {
//                                     dynamicDate.isLeave = true;
//                                 }
//                             });
//                         });
//                     }

//                     await plan.save();
//                     updatedPlans.push(plan);
//                 }
//             }
//         }

//         if (updatedPlans.length === 0) {
//             return res.status(400).json({
//                 message: "No new leaves applied. Either the dates don't exist in any plan or leave is already applied for these dates."
//             });
//         }

//         res.status(200).json({
//             message: `Leave applied successfully across ${updatedPlans.length} plans`,
//             updatedPlans
//         });

//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ message: "Internal server error" });
//     }
// };

//delete plan by id

exports.deletePlan = async (req, res) => {
  const { id } = req.params;
  try {
    const deletedPlan = await Plan.findByIdAndDelete(id);
    if (!deletedPlan) {
      return res.status(404).json({ message: "Plan not found" });
    }

    
    res.status(200).json({ message: "Plan deleted successfully", deletedPlan });

    const customer = await Customer.findById({_id: deletedPlan.customer});
   if (!customer) {
     return res.status(404).json({ message: "Customer not found" });
   }

   const deliveryBoy = await AdminsModel.findOne({ route: customer.routeno });

    const messageCustomer = `🛒 Delete plan`;

   const notificationCustomer = new Notification({
      customerId: customer._id,
     messageCustomer,
   });
   await notificationCustomer.save();

  

   const message = `🛒 ${customer.name} (Route ${customer.routeno}) delete plan`;

   const notification = new Notification({
     deliveryboyId: deliveryBoy._id,
     message,
   });
   await notification.save();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};
