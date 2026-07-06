const { DataSource } = require('typeorm');

// Recalculate all rubric assessments with the CORRECT algorithm
async function recalculateRubricScores() {
  console.log('🔧 Starting CORRECT rubric scores recalculation...');

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

    // Find all assessments 
    const allAssessments = await dataSource.query(`
      SELECT 
        tra.id,
        tra."taskSubmissionId",
        tra."rubricId",
        tra."studentId",
        tra."totalScore",
        tra.percentage,
        tra."maxPossibleScore"
      FROM task_rubric_assessments tra 
    `);

    console.log(`🎯 Found ${allAssessments.length} assessments to recalculate`);

    for (const assessment of allAssessments) {
      console.log(`\n📊 Processing assessment ${assessment.id}...`);

      // Get rubric info
      const rubricInfo = await dataSource.query(`
        SELECT r."maxScore" FROM rubrics r WHERE r.id = $1
      `, [assessment.rubricId]);

      if (rubricInfo.length === 0) {
        console.log(`⚠️  No rubric found for assessment ${assessment.id}`);
        continue;
      }

      // Get all levels for this rubric to find max level score
      const rubricLevels = await dataSource.query(`
        SELECT rl."scoreValue" FROM rubric_levels rl 
        JOIN rubrics r ON r.id = rl."rubricId"
        WHERE r.id = $1
      `, [assessment.rubricId]);

      if (rubricLevels.length === 0) {
        console.log(`⚠️  No levels found for rubric ${assessment.rubricId}`);
        continue;
      }

      const maxLevelScore = Math.max(...rubricLevels.map(l => parseFloat(l.scoreValue)));
      console.log(`📈 Max level score for rubric: ${maxLevelScore}`);

      // Get criteria assessments for this rubric assessment
      const criteriaAssessments = await dataSource.query(`
        SELECT 
          trac."criterionId",
          trac."levelId", 
          trac.score,
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

      // CORRECT CALCULATION
      let totalPoints = 0;

      console.log('📈 Criteria breakdown with CORRECT calculation:');
      for (const criterion of criteriaAssessments) {
        const levelScore = parseFloat(criterion.level_score); // e.g., 4
        const criterionWeight = parseFloat(criterion.criterion_weight); // e.g., 0.25
        
        // CORRECT FORMULA:
        // levelPercentage = levelScore / maxLevelScore (e.g., 4/4 = 100%)
        // criterionMaxPoints = criterionWeight * 100 (e.g., 0.25 * 100 = 25 points)
        // earnedPoints = levelPercentage * criterionMaxPoints (e.g., 1.0 * 25 = 25 points)
        
        const levelPercentage = levelScore / maxLevelScore;
        const criterionMaxPoints = criterionWeight * 100;
        const earnedPoints = levelPercentage * criterionMaxPoints;
        
        totalPoints += earnedPoints;
        
        console.log(`  - Level: ${levelScore}/${maxLevelScore} (${(levelPercentage*100).toFixed(1)}%), Weight: ${(criterionWeight*100).toFixed(1)}%, Points: ${earnedPoints.toFixed(2)}`);
      }

      const finalScore = Math.round(totalPoints * 100) / 100;
      const percentage = finalScore; // Since we're already in 100-point scale

      console.log(`📊 CORRECT calculation results:`);
      console.log(`  - Total Points: ${finalScore}`);
      console.log(`  - Percentage: ${percentage}%`);

      // Update the assessment with correct values
      await dataSource.query(`
        UPDATE task_rubric_assessments 
        SET 
          "totalScore" = $1,
          percentage = $2,
          "maxPossibleScore" = 100,
          "updatedAt" = NOW()
        WHERE id = $3
      `, [finalScore, percentage, assessment.id]);

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

      console.log(`✅ Updated assessment ${assessment.id} with CORRECT score: ${finalScore}/100 (${percentage}%)`);
    }

    console.log(`\n🎉 Successfully recalculated ${allAssessments.length} assessments with CORRECT algorithm!`);

  } catch (error) {
    console.error('❌ Error recalculating scores:', error);
  } finally {
    await dataSource.destroy();
    console.log('🔌 Database connection closed');
  }
}

// Run the recalculation
recalculateRubricScores().catch(console.error);