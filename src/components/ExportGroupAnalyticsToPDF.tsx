import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import Chart from 'chart.js/auto';


const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

function getSafeFileName(name: string) {
  return name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
}

export default async function exportGroupAnalyticsToPDF({
  group,
  analytics,
  expenses,
  memberSpendingData,
  categorySpendingData,
  monthlyData,
}: {
  group: any;
  analytics: any;
  expenses: any[];
  memberSpendingData: any[];
  categorySpendingData: any[];
  monthlyData: any[];
}) {
  try {
    // 1. Create a hidden container for the report
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '800px';
    container.style.background = '#fff';
    container.style.color = '#222';
    container.style.fontFamily = 'Arial, sans-serif';
    container.style.fontSize = '14px';
    container.style.padding = '32px';

    // 2. Fill the container with HTML content
    container.innerHTML = `
      <h1 style="text-align:center;color:#2563eb;margin-bottom:0">${group.name}</h1>

      <h2 style="text-align:center;color:#64748b;margin-top:4px">Analytics Report</h2>
      <hr style="margin:24px 0;border-color:#e5e7eb" />
      <div style="background:#f0f8ff;border:1px solid #3b82f6;border-radius:8px;padding:16px;margin-bottom:24px">
        <h3 style="margin:0;color:#2563eb">Group Information</h3>
        <div>Type: <b>${group.groupType || 'Standard'}</b></div>
        <div>Members: <b>${group.members.length}</b></div>
        <div>Description: <b>${group.description || 'No description'}</b></div>
      </div>
      <div style="background:#f8fafc;border:1px solid #64748b;border-radius:8px;padding:16px;margin-bottom:24px">
        <h3 style="margin:0;color:#334155">Summary Metrics</h3>
        <ul>
          <li>Total Spent: <b>${formatCurrency(analytics.totalSpent)}</b></li>
          <li>Average per Person: <b>${formatCurrency(analytics.totalSpent / group.members.length)}</b></li>
          <li>Total Expenses: <b>${analytics.expenseCount}</b></li>
          <li>Categories Used: <b>${Object.keys(analytics.categorySpending).length}</b></li>
        </ul>
      </div>



      <h3 style="color: #f59e11; font-family: Arial, sans-serif; font-size: 18px; margin-top: 32px; margin-bottom: 16px;">
  Group Members
</h3>

<table style="width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; font-size: 14px; color: #1e293b; margin-bottom: 24px;">
  <thead>
    <tr style="background: #fef3c7; color: #78350f;">
      <th style="padding: 10px; text-align: left; border-bottom: 1px solid #fde68a;">Name</th>
      <th style="padding: 10px; text-align: left; border-bottom: 1px solid #fde68a;">Email</th>
      <th style="padding: 10px; text-align: left; border-bottom: 1px solid #fde68a;">Role</th>
      <th style="padding: 10px; text-align: left; border-bottom: 1px solid #fde68a;">Total Spent</th>
    </tr>
  </thead>
  <tbody>
    ${group.members.map((m, i) => `
      <tr style="background: ${i % 2 ? '#fffbeb' : '#ffffff'};">
        <td style="padding: 10px; border-bottom: 1px solid #fef9c3;">${m.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #fef9c3;">${m.email || 'N/A'}</td>
        <td style="padding: 10px; border-bottom: 1px solid #fef9c3;">${m.role || 'Member'}</td>
        <td style="padding: 10px; border-bottom: 1px solid #fef9c3;">${formatCurrency(memberSpendingData.find(md => md.name === m.name)?.amount || 0)}</td>
      </tr>
    `).join('')}
  </tbody>
</table>

 <! -- Member Spending Breakdown --> 
     <div >
            <h3 style="color: #2563eb; margin-top: 32px; font-family: Arial, sans-serif; margin-bottom: 16px;">
        Member Spending Breakdown
        </h3>
<div>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-family: Arial, sans-serif; font-size: 14px; color: #1e293b;">
        <thead>
            <tr style="background: #e0e7ff;">
            <th style="padding: 10px; text-align: left; border-bottom: 1px solid #cbd5e1;">Name</th>
            <th style="padding: 10px; text-align: left; border-bottom: 1px solid #cbd5e1;">Amount Spent</th>
            <th style="padding: 10px; text-align: left; border-bottom: 1px solid #cbd5e1;">% of Total</th>
            </tr>
        </thead>
        <tbody>
            ${memberSpendingData.map((m, i) => `
            <tr style="background: ${i % 2 ? '#f1f5f9' : '#ffffff'};">
                <td style="padding: 10px; white-space: nowrap; border-bottom: 1px solid #e2e8f0;">${m.name}</td>
                <td style="padding: 10px; white-space: nowrap; border-bottom: 1px solid #e2e8f0;">${formatCurrency(m.amount)}</td>
                <td style="padding: 10px; white-space: nowrap; border-bottom: 1px solid #e2e8f0;">${m.percentage.toFixed(1)}%</td>
            </tr>
            `).join('')}
        </tbody>
        </table>
</div>
<!-- <div>
        <canvas id="memberChart" width="600" height="300"></canvas>
</div>
-->
</div>

<h3 style="color: #059669; font-family: Arial, sans-serif; font-size: 18px; margin-top: 32px; margin-bottom: 16px;">
  Category Spending Analysis
</h3>

<table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-family: Arial, sans-serif; font-size: 14px; color: #1e293b;">
  <thead>
    <tr style="background: #bbf7d0; color: #065f46;">
      <th style="padding: 10px; text-align: left; border-bottom: 1px solid #a7f3d0;">Category</th>
      <th style="padding: 10px; text-align: left; border-bottom: 1px solid #a7f3d0;">Amount</th>
      <th style="padding: 10px; text-align: left; border-bottom: 1px solid #a7f3d0;">% of Total</th>
    </tr>
  </thead>
  <tbody>
    ${categorySpendingData.map((c, i) => `
      <tr style="background: ${i % 2 ? '#f0fdf4' : '#ffffff'};">
        <td style="padding: 10px; border-bottom: 1px solid #d1fae5;">${c.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #d1fae5;">${formatCurrency(c.amount)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #d1fae5;">${c.percentage.toFixed(1)}%</td>
      </tr>
    `).join('')}
  </tbody>
</table>




     <h3 style="color: #8b5cf6; font-family: Arial, sans-serif; font-size: 18px; margin-top: 32px; margin-bottom: 16px;">
  Monthly Spending Trend
</h3>

<table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-family: Arial, sans-serif; font-size: 14px; color: #1e293b;">
  <thead>
    <tr style="background: #ede9fe; color: #4c1d95;">
      <th style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd6fe;">Month</th>
      <th style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd6fe;">Total Amount</th>
      <th style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd6fe;">Expense Count</th>
      <th style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd6fe;">Avg per Expense</th>
    </tr>
  </thead>
  <tbody>
    ${monthlyData.map((m, i) => `
      <tr style="background: ${i % 2 ? '#f8fafc' : '#ffffff'};">
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${m.month}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${formatCurrency(m.amount)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${m.count}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${m.count > 0 ? formatCurrency(m.amount / m.count) : '$0.00'}</td>
      </tr>
    `).join('')}
  </tbody>
</table>







  <h3 style="color: #dc267f; font-family: Arial, sans-serif; font-size: 18px; margin-top: 32px; margin-bottom: 16px;">
  Complete Expense List
</h3>

<table style="width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; font-size: 12px; color: #1e293b; margin-bottom: 24px;">
  <thead>
    <tr style="background: #fbcfe8; color: #831843;">
      <th style="padding: 8px; text-align: left; border-bottom: 1px solid #fda4af;">Description</th>
      <th style="padding: 8px; text-align: left; border-bottom: 1px solid #fda4af;">Category</th>
      <th style="padding: 8px; text-align: left; border-bottom: 1px solid #fda4af;">Amount</th>
      <th style="padding: 8px; text-align: left; border-bottom: 1px solid #fda4af;">Date</th>
      <th style="padding: 8px; text-align: left; border-bottom: 1px solid #fda4af;">Paid By</th>
      <th style="padding: 8px; text-align: left; border-bottom: 1px solid #fda4af;">Split Type</th>
    </tr>
  </thead>
  <tbody>
    ${expenses
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .map(
        (e, i) => `
      <tr style="background: ${i % 2 ? '#fdf2f8' : '#ffffff'};">
        <td style="padding: 8px; border-bottom: 1px solid #fce7f3;">${e.description}</td>
        <td style="padding: 8px; border-bottom: 1px solid #fce7f3;">${e.category}</td>
        <td style="padding: 8px; border-bottom: 1px solid #fce7f3;">${formatCurrency(e.amount)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #fce7f3;">${new Date(e.date).toLocaleDateString()}</td>
        <td style="padding: 8px; border-bottom: 1px solid #fce7f3;">${e.paidBy?.name ?? ''}</td>
        <td style="padding: 8px; border-bottom: 1px solid #fce7f3;">${e.splitType ?? 'Equal'}</td>
      </tr>
    `
      )
      .join('')}
  </tbody>
</table>


<h3 style="color: #2563eb; font-family: Arial, sans-serif; font-size: 18px; margin-top: 32px; margin-bottom: 16px;">
  Key Insights
</h3>

<ul style="list-style-type: disc; padding-left: 20px; font-family: Arial, sans-serif; font-size: 14px; color: #1e293b; margin-bottom: 32px;">
  <li style="margin-bottom: 8px;">
    Highest spender: <b>${memberSpendingData[0]?.name}</b> – <b>${formatCurrency(memberSpendingData[0]?.amount || 0)}</b>
  </li>
  <li style="margin-bottom: 8px;">
    Most expensive category: <b>${categorySpendingData[0]?.name}</b> – <b>${formatCurrency(categorySpendingData[0]?.amount || 0)}</b>
  </li>
  <li style="margin-bottom: 8px;">
    Peak month: <b>${monthlyData.reduce((max, m) => m.amount > max.amount ? m : max, monthlyData[0])?.month}</b> – <b>${formatCurrency(monthlyData.reduce((max, m) => m.amount > max.amount ? m : max, monthlyData[0])?.amount || 0)}</b>
  </li>
  <li style="margin-bottom: 8px;">
    Avg. expense: <b>${formatCurrency(analytics.totalSpent / analytics.expenseCount)}</b>
  </li>
  <li style="margin-bottom: 8px;">
    Most active month: <b>${monthlyData.reduce((max, m) => m.count > max.count ? m : max, monthlyData[0])?.month}</b>
    (${monthlyData.reduce((max, m) => m.count > max.count ? m : max, monthlyData[0])?.count} expenses)
  </li>
</ul>

<div style="text-align: center; color: #64748b; font-family: Arial, sans-serif; font-size: 12px; margin-top: 24px;">
  Generated on: ${new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })}
</div>

    `;


    document.body.appendChild(container);

// ✅ Wait a tick to ensure canvas is in the DOM
await new Promise((resolve) => setTimeout(resolve, 100));

// Now the canvas exists
const canvasEl = container.querySelector('#memberChart') as HTMLCanvasElement;
if (canvasEl) {
  const ctx = canvasEl.getContext('2d');

  if (ctx) {
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: memberSpendingData.map(m => m.name),
        datasets: [{
          label: 'Amount Spent',
          data: memberSpendingData.map(m => m.amount),
          backgroundColor: '#60a5fa',
          borderColor: '#3b82f6',
          borderWidth: 1
        }]
      },
      options: {
        responsive: false,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: value => `$${value}`
            },
            title: {
              display: true,
              text: 'Amount Spent ($)'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Members'
            }
          }
        }
      }
    });

    // Allow chart to fully render before screenshot
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
}



//     const ctx = document.getElementById('memberChart').getContext('2d');

// new Chart(ctx, {
//   type: 'bar',
//   data: {
//     labels: memberSpendingData.map(m => m.name),
//     datasets: [{
//       label: 'Amount Spent',
//       data: memberSpendingData.map(m => m.amount),
//       backgroundColor: '#60a5fa', // light blue
//       borderColor: '#3b82f6',
//       borderWidth: 1
//     }]
//   },
//   options: {
//     responsive: false,
//     plugins: {
//       legend: { display: false }
//     },
//     scales: {
//       y: {
//         beginAtZero: true,
//         ticks: {
//           callback: value => `$${value}`
//         },
//         title: {
//           display: true,
//           text: 'Amount Spent ($)'
//         }
//       },
//       x: {
//         title: {
//           display: true,
//           text: 'Members'
//         }
//       }
//     }
//   }
// });




    // 3. Use html2canvas to capture the container
    const canvas = await html2canvas(container, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4',
    });

    // 4. Calculate image dimensions to fit A4
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgProps = pdf.getImageProperties(imgData);
    const imgWidth = pageWidth;
    const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

 let y = 0;

while (y < imgHeight) {
  pdf.addImage(imgData, 'JPEG', 0, 0 - y, imgWidth, imgHeight, undefined, 'FAST');
  y += pageHeight;

  if (y < imgHeight) {
    pdf.addPage();
  }
}


    // 6. Footer
 const pageCount = pdf.getNumberOfPages();
const fontSize = 8;
pdf.setFontSize(fontSize);

for (let i = 1; i <= pageCount; i++) {
  pdf.setPage(i);

  const footerText = `Developed with Love by Sumon Ahmed - Page ${i} of ${pageCount}`;
  const textWidth = pdf.getTextWidth(footerText);
  const x = (pageWidth - textWidth) / 2;
  const y = pageHeight - 10;

  // Draw centered footer text
  pdf.text(footerText, x, y);

  // Optional: Add a hyperlink over "Sumon Ahmed"
  const nameStartIndex = footerText.indexOf('Sumon Ahmed');
  const nameText = 'Sumon Ahmed';
  const nameWidth = pdf.getTextWidth(nameText);

  // Calculate x-offset of just the "Sumon Ahmed" part
  const nameX = x + pdf.getTextWidth(footerText.slice(0, nameStartIndex));

  // Add hyperlink box over the name
  pdf.link(nameX, y - fontSize + 2, nameWidth, fontSize + 2, {
    url: 'https://sumonahmed.info',
  });
}

    // 7. Save and cleanup
    const safeFileName = getSafeFileName(group.name);
    pdf.save(`${safeFileName}-analytics-report.pdf`);
    document.body.removeChild(container);

  } catch (err) {
    console.error('PDF generation failed:', err);
    alert('Failed to export PDF. Please try again.');
  }
}