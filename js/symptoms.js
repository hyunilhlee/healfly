import { handleConsultation, showErrorMessage } from './consultation.js';

export async function renderSymptomCards() {
    try {
        const response = await fetch('/data/symptoms.json');
        if (!response.ok) throw new Error('증상 데이터를 불러올 수 없습니다.');
        
        const data = await response.json();
        const symptomsGrid = document.getElementById('symptomsGrid');
        symptomsGrid.innerHTML = ''; // 기존 내용 초기화
        
        // 메인 카테고리만 표시
        data.categories
            .sort((a, b) => a.orderIndex - b.orderIndex)
            .forEach(category => {
                const card = createMainCategoryCard(category);
                symptomsGrid.appendChild(card);
            });

        addCardEventListeners();
        
    } catch (error) {
        console.error('증상 데이터 로딩 실패:', error);
        showErrorMessage('증상 목록을 불러오는데 실패했습니다.');
    }
}

function createMainCategoryCard(category) {
    const card = document.createElement('div');
    card.className = 'symptom-card main-category';
    card.dataset.categoryId = category.id;
    
    card.innerHTML = `
        <div class="icon-wrapper">
            <div class="temp-icon">${category.name.charAt(0)}</div>
        </div>
        <h3 class="symptom-title">${category.name}</h3>
        <p class="symptom-description">${category.description}</p>
    `;
    
    return card;
}

function addCardEventListeners() {
    document.querySelectorAll('.main-category').forEach(card => {
        card.addEventListener('click', async (e) => {
            const categoryId = card.dataset.categoryId;
            const data = await loadSymptomData();
            const category = data.categories.find(c => c.id === categoryId);
            
            if (category) {
                showSubcategories(category);
            }
        });
    });
}

function showSubcategories(category) {
    const mainGrid = document.getElementById('symptomsGrid');
    const subcategoryList = createSubcategoryList(category);
    
    mainGrid.style.display = 'none';
    mainGrid.parentElement.appendChild(subcategoryList);
    
    // 뒤로가기 버튼 이벤트
    subcategoryList.querySelector('.back-button').addEventListener('click', () => {
        subcategoryList.remove();
        mainGrid.style.display = 'grid';
    });
    
    // 서브카테고리 선택 이벤트
    subcategoryList.querySelectorAll('.subcategory-card').forEach(subCard => {
        subCard.addEventListener('click', async () => {
            const subcategoryId = subCard.dataset.subcategoryId;
            const subcategory = category.subcategories.find(sub => sub.id === subcategoryId);
            
            if (subcategory) {
                // 선택한 증상 정보를 세션 스토리지에 저장
                const symptomData = {
                    mainCategory: {
                        id: category.id,
                        name: category.name,
                        description: category.description
                    },
                    subCategory: {
                        id: subcategory.id,
                        name: subcategory.name
                    }
                };
                
                sessionStorage.setItem('selectedSymptom', JSON.stringify(symptomData));
                showUserInfoForm();
            }
        });
    });
}

function createSubcategoryList(category) {
    const container = document.createElement('div');
    container.className = 'subcategory-container';
    
    container.innerHTML = `
        <div class="subcategory-header">
            <button class="back-button">← 이전으로</button>
            <h2>${category.name}</h2>
            <p class="subcategory-description">${category.description || '관련 증상을 선택해주세요'}</p>
        </div>
        <div class="subcategory-grid">
            ${category.subcategories.map(sub => `
                <div class="symptom-card subcategory-card" data-subcategory-id="${sub.id}">
                    <div class="icon-wrapper">
                        <div class="temp-icon">${sub.name.charAt(0)}</div>
                    </div>
                    <h3 class="symptom-title">${sub.name}</h3>
                </div>
            `).join('')}
        </div>
    `;
    
    return container;
}

async function loadSymptomData() {
    const response = await fetch('/data/symptoms.json');
    if (!response.ok) throw new Error('증상 데이터를 불러올 수 없습니다.');
    return await response.json();
}

function showUserInfoForm() {
    const mainGrid = document.getElementById('symptomsGrid');
    const userInfoForm = document.getElementById('userInfoForm');
    
    if (!userInfoForm) {
        console.error('기본 정보 폼을 찾을 수 없습니다.');
        return;
    }
    
    // 증상 선택 화면 숨기기
    mainGrid.classList.add('hidden');
    
    // 서브카테고리 컨테이너가 있다면 제거
    const subcategoryContainer = document.querySelector('.subcategory-container');
    if (subcategoryContainer) {
        subcategoryContainer.remove();
    }
    
    // 기본 정보 폼 표시
    userInfoForm.classList.remove('hidden');
    
    // 진행 바 업데이트
    const activeStep = document.querySelector('.step.active');
    if (activeStep) {
        activeStep.classList.remove('active');
    }
    document.querySelectorAll('.step')[1].classList.add('active');
} 