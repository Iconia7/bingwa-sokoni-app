function normalizePlans(plans) {
  return (plans || []).map(plan => {
    let { type, category, planName = '' } = plan;
    const name = planName.toUpperCase();

    // 1. Infer Type
    if (!type || type === 'default') {
      if (name.includes('SMS')) type = 'SMS';
      else if (name.includes('MIN') || name.includes('CALL')) type = 'Minutes';
      else type = 'Data';
    }

    // 2. Infer Category
    if (!category || category === 'default') {
      if (name.includes('1HR') || name.includes('1 HR') || name.includes('3HR')) category = 'Hourly';
      else if (name.includes('24HR') || name.includes('MIDNIGHT') || name.includes('DAY')) category = 'Daily';
      else if (name.includes('WEEK') || name.includes('7 DAY')) category = 'Weekly';
      else if (name.includes('MONTH') || name.includes('30 DAY')) category = 'Monthly';
      else category = 'Daily'; // Default to Daily for better visibility
    }

    return { ...plan, type, category };
  });
}

const testData = [
    { "id": "1", "planName": "250MB, 24hrs", "amount": 20 },
    { "id": "6", "planName": "50mins, till Midnight", "amount": 53 },
    { "id": "12", "planName": "20sms, 24hrs", "amount": 5 }
];

const result = normalizePlans(testData);
console.log(JSON.stringify(result, null, 2));
