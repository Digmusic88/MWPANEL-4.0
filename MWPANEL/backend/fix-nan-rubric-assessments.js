const { DataSource } = require('typeorm');

// Fix NaN rubric assessments by recalculating scores
async function fixNaNRubricAssessments() {
  console.log('🔧 Starting NaN rubric assessments fix...');

  // Database configuration
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    username: process.env.DB_USERNAME || 'mwpanel',
    password: process.env.DB_PASSWORD || 'mwpanel123',
    database: process.env.DB_NAME || 'mwpanel',
    synchronize: false,
    logging: false,
  });

  try {
    await dataSource.initialize();
    console.log('✅ Database connected');

    // Find all assessments with NaN values
    const nanAssessments = await dataSource.query(`
      SELECT 
        tra.id,
        tra."taskSubmissionId",
        tra."rubricId",
        tra."studentId",
        tra."totalScore",
        tra.percentage,
        tra."maxPossibleScore"
      FROM task_rubric_assessments tra 
      WHERE tra."totalScore"::text = 'NaN' 
         OR tra.percentage::text = 'NaN'
         OR tra."totalScore" IS NULL
         OR tra.percentage IS NULL
    `);

    console.log(`🎯 Found ${nanAssessments.length} assessments with NaN/NULL values`);

    for (const assessment of nanAssessments) {
      console.log(`\n📊 Processing assessment ${assessment.id}...`);

      // Get criteria assessments for this rubric assessment
      const criteriaAssessments = await dataSource.query(`
        SELECT 
          trac."criterionId",
          trac."levelId", 
          trac.score,
          trac."weightedScore",
          rc.weight as criterion_weight,
          rl."scoreValue" as level_score
        FROM task_rubric_assessment_criteria trac
        JOIN rubric_criteria rc ON rc.id = trac."criterionId"
        JOIN rubric_levels rl ON rl.id = trac."levelId"
        WHERE trac."taskRubricAssessmentId" = $1
      `, [assessment.id]);

      if (criteriaAssessments.length === 0) {
        console.log(`⚠️  No criteria assessments found for assessment ${assessment.id}`);
        continue;
      }

      // Calculate correct total score
      let totalWeightedScore = 0;
      let totalWeight = 0;

      console.log('📈 Criteria breakdown:');
      for (const criterion of criteriaAssessments) {
        const weight = parseFloat(criterion.criterion_weight);
        const levelScore = parseFloat(criterion.level_score);
        const weightedScore = levelScore * weight;
        
        totalWeightedScore += weightedScore;
        totalWeight += weight;
        
        console.log(`  - Score: ${levelScore}, Weight: ${weight}, Weighted: ${weightedScore.toFixed(3)}`);
      }

      // Get rubric max score
      const rubricData = await dataSource.query(`
        SELECT "maxScore" FROM rubrics WHERE id = $1
      `, [assessment.rubricId]);

      const maxScore = rubricData[0]?.maxScore || 100;
      
      // Calculate final score and percentage
      const finalScore = totalWeightedScore;
      const percentage = (finalScore / maxScore) * 100;

      console.log(`📊 Calculated totals:`);
      console.log(`  - Total Weighted Score: ${totalWeightedScore.toFixed(3)}`);
      console.log(`  - Total Weight: ${totalWeight.toFixed(3)}`);
      console.log(`  - Max Score: ${maxScore}`);
      console.log(`  - Final Score: ${finalScore.toFixed(3)}`);
      console.log(`  - Percentage: ${percentage.toFixed(2)}%`);

      // Update the assessment with correct values
      await dataSource.query(`
        UPDATE task_rubric_assessments 
        SET 
          "totalScore" = $1,
          percentage = $2,
          "maxPossibleScore" = $3,
          "updatedAt" = NOW()
        WHERE id = $4
      `, [finalScore, percentage, maxScore, assessment.id]);

      // Also update the task submission grade
      await dataSource.query(`
        UPDATE task_submissions 
        SET 
          grade = $1,
          "finalGrade" = $1,
          "isGraded" = true,
          status = 'graded'
        WHERE id = $2
      `, [finalScore, assessment.taskSubmissionId]);

      console.log(`✅ Updated assessment ${assessment.id} and submission ${assessment.taskSubmissionId}`);
    }

    console.log(`\n🎉 Successfully fixed ${nanAssessments.length} assessments!`);

    // Verify the fixes
    const remainingNaN = await dataSource.query(`
      SELECT COUNT(*) as count
      FROM task_rubric_assessments 
      WHERE "totalScore"::text = 'NaN' 
         OR percentage::text = 'NaN'
         OR "totalScore" IS NULL
         OR percentage IS NULL
    `);

    console.log(`🔍 Remaining NaN assessments: ${remainingNaN[0].count}`);

  } catch (error) {
    console.error('❌ Error fixing NaN assessments:', error);
  } finally {
    await dataSource.destroy();
    console.log('🔌 Database connection closed');
  }
}

// Run the fix
fixNaNRubricAssessments().catch(console.error);