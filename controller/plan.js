const Plan = require("../models/plans");
const Customer = require("../models/customer");

// Utility function to calculate 30 days from the current date
const getStartDate = () => {
    const now = new Date();
    if (now.getHours() >= 6) {
        now.setDate(now.getDate() + 1); // Move to the next day if current time is past 6 AM
    }
    now.setHours(0, 0, 0, 0); // Reset time to midnight
    return now;
};

const calculateMonthlyDates = () => {
    const startDate = getStartDate();
    const dates = [];
    for (let i = 0; i < 30; i++) {
        const newDate = new Date(startDate);
        newDate.setDate(startDate.getDate() + i);
        dates.push(newDate);
    }
    return dates;
};

const calculateDailyDates = () => {
    const startDate = getStartDate();
    const dates = [];
    for (let i = 0; i < 90; i++) {
        const newDate = new Date(startDate);
        newDate.setDate(startDate.getDate() + i);
        dates.push(newDate);
    }
    return dates;
};



// Create a new plan for a customer
exports.createPlan = async (req, res) => {
    const { customerId, planType, customDates, weeklyDays, alternativeDays } = req.body;

    try {
        const customer = await Customer.findById(customerId);
        if (!customer) {
            return res.status(404).json({ message: "Customer not found" });
        }

        let dates = [];
        switch (planType) {
            case "daily":
                dates = calculateDailyDates(); // Generate 90 days for daily plan
                break;

            case "custom":
                if (!customDates || !Array.isArray(customDates)) {
                    return res.status(400).json({ message: "Invalid custom dates" });
                }
                dates = customDates.map(date => new Date(date));
                break;

                case "weekly":
                    if (!weeklyDays || !Array.isArray(weeklyDays)) {
                        return res.status(400).json({ message: "Invalid weekly days" });
                    }
                
                    const startDates = getStartDate(); // Get adjusted start date
                    const daysToGenerate = 90; // Generate for 90 days
                
                    for (let day of weeklyDays) {
                        let currentDate = new Date(startDates);
                        let offset = (day - currentDate.getDay() + 7) % 7;
                        currentDate.setDate(currentDate.getDate() + offset); // Move to the correct weekday
                
                        while (currentDate <= new Date(startDates.getTime() + daysToGenerate * 86400000)) {
                            dates.push(new Date(currentDate)); // Add to the list
                            currentDate.setDate(currentDate.getDate() + 7); // Move to next week
                        }
                    }
                
                    // Sort the dates to ensure correct order
                    dates.sort((a, b) => a - b);
                    break;
                

case "alternative":
    const { startDate, interval } = req.body;
    if (!startDate || !interval || typeof interval !== "number") {
        return res.status(400).json({ message: "Invalid alternative plan details" });
    }

    let altStartDate = new Date(startDate);
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
                dates = calculateMonthlyDates();
                break;
                case "none":
                    dates.push(getStartDate()); 
                    break;
                           
               
            default:
                return res.status(400).json({ message: "Invalid plan type" });
        }

        const newPlan = new Plan({
            customer: customerId,
            planType,
            dates
        });

        await newPlan.save();
        res.status(201).json({ message: "Plan created successfully", plan: newPlan });
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
exports.stopDailyPlan =async (req, res) => {
    const { planId } = req.params;
    const today = new Date(); // Get the current date

    try {
        const plan = await Plan.findById(planId);

        if (!plan) {
            return res.status(404).json({ message: "Plan not found" });
        }

        // Remove future dates (keep only dates up to today)
        const updatedDates = plan.dates.filter(date => new Date(date) <= today);

        // Update the plan: set inactive and update dates
        plan.isActive = false;
        plan.dates = updatedDates;

        await plan.save();

        res.status(200).json({ message: `${plan.planType} plan stopped successfully`, plan });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
};

exports.getPlansByCustomerId = async (req, res) => {
    const { customerId } = req.params;

    try {
        const plans = await Plan.find({ customer: customerId }).populate("customer");

        if (plans.length === 0) {
            return res.status(404).json({ message: "No plans found for this customer" });
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
            isActive: true 
        });

        if (plans.length === 0) {
            return res.status(404).json({ message: "No active plans found for this customer" });
        }

        // Convert incoming dates to strings for easier comparison
        const leaveDates = dates.map(date => new Date(date).toISOString().split('T')[0]);

        let updatedPlans = [];
        
        for (const plan of plans) {
            // Remove leave dates from plan.dates
            const newDates = plan.dates.filter(planDate => {
                const planDateString = new Date(planDate).toISOString().split('T')[0];
                return !leaveDates.includes(planDateString);
            });

            // Remove leave dates from plan.leaves
            const newLeaves = plan.leaves.filter(leaveDate => {
                const leaveDateString = new Date(leaveDate).toISOString().split('T')[0];
                return !leaveDates.includes(leaveDateString);
            });

            // Update dynamicDates if present
            if (plan.dynamicDates && plan.dynamicDates.length > 0) {
                plan.dynamicDates = plan.dynamicDates.filter(dynamicDate => {
                    const dynamicDateString = new Date(dynamicDate.date).toISOString().split('T')[0];
                    return !leaveDates.includes(dynamicDateString);
                });
            }

            // Check if changes were made
            if (newDates.length !== plan.dates.length || newLeaves.length !== plan.leaves.length) {
                plan.dates = newDates;
                plan.leaves = newLeaves;
                
                await plan.save();
                updatedPlans.push(plan);
            }
        }

        if (updatedPlans.length === 0) {
            return res.status(400).json({ 
                message: "No matching leave dates found in any plan to remove." 
            });
        }

        res.status(200).json({ 
            message: `Leave dates removed successfully across ${updatedPlans.length} plans`, 
            updatedPlans 
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
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
};