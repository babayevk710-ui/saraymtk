# Bonus Hesablamaları

Bu modul bonus kampaniyasını iki hissədə idarə edir:

1. **Kampaniyanın əsas məlumatları**: kampaniyanın nə vaxt, hansı filialda və hansı müştərilərə tətbiq ediləcəyini müəyyən edir.
2. **Bonus qaydaları**: alış şərtinin nəticəsində müştərinin nə qazanacağını müəyyən edir.

Bu iki hissə qəsdən ayrı saxlanılıb. Əsas məlumatlar kampaniyanın çərçivəsidir, qaydalar isə həmin çərçivədə işləyən ayrı-ayrı kombinasiyalardır.

## 1. Kampaniya yaratmaq

`Bonus Hesablamaları` menyusuna daxil olun. Əsas məlumatlar bölməsi ilkin olaraq yığılmış görünür. `Məlumatları aç` düyməsi ilə formu açın.

Doldurulan sahələr:

- Kampaniya adı: yadda saxlanması üçün əsas identifikatordur.
- Status: `Aktiv`, `Qaralama` və ya `Dayandırılıb`.
- Başlanğıc və bitiş tarixi: kampaniya bu tarix aralığında işləyir.
- Başlanğıc və bitiş saatı: seçilən günlərdə kampaniyanın aktiv saatlarıdır.
- İş yerləri: kampaniyanın işləyəcəyi filiallar.
- Həftə günləri: kampaniyanın işləyəcəyi günlər.
- Müştəri qrupu: bütün müştərilər, bonus kart sahibləri, yeni müştərilər və ya seçilmiş qrup.
- Minimum alış məbləği: səbət bu məbləğdən aşağıdırsa bonus tətbiq edilmir.
- Müştəri başına limit: eyni müştərinin kampaniyadan neçə dəfə istifadə edə biləcəyi.
- Ümumi kampaniya limiti: kampaniyanın ümumi istifadə limiti.
- Digər bonuslarla birlikdə tətbiq: işarələnməsə, sistem başqa bonusla toqquşmada bu bonusu birləşdirməməlidir.
- Bonus kart tələb olunsun: işarələnərsə, müştəridə bonus kart olmalıdır.
- Qeyd və əlavə şərtlər: kassir və gələcək server məntiqi üçün izah sahəsi.

## 2. Qayda əlavə etmək

`Qayda əlavə et` düyməsi ayrıca qayda pəncərəsi açır. Bir kampaniyada bir neçə qayda ola bilər.

### Qayda növləri

- **Məbləğə görə**: məsələn, 50 AZN alışa bonus.
- **Miqdara görə**: məsələn, 3 ədəd alana bonus.
- **Məhsula görə**: konkret məhsula aid bonus.
- **Kateqoriyaya görə**: seçilmiş məhsul kateqoriyasına aid bonus.

### Şərt sahələri

- Miqdar
- Qiymət
- Cəmi məbləğ
- Faiz

### Hədiyyə nəticələri

- Bonus balı
- Faiz endirimi
- Pulsuz məhsul
- Pulsuz çatdırılma
- Kassa kuponu
- Hədiyyə kartı
- Hədiyyə miqdarı
- Hədiyyə dəyəri
- Hədiyyə məhsulu və ya məhsul kodu

### Əlavə qayda seçimləri

- Yalnız ilk alışda
- Yalnız onlayn satışda
- Kassir təsdiqi tələb etsin
- Qayda prioriteti

Qayda siyahıya əlavə edildikdən sonra kart kimi görünür. Kartın `×` düyməsi yalnız həmin qaydanı silir.

## 3. Boş və səhv məlumatlar

- Kampaniya adı boşdursa yadda saxlama mümkün deyil.
- Başlanğıc və bitiş tarixi boşdursa yadda saxlama mümkün deyil.
- Başlanğıc tarixi bitiş tarixindən sonradırsa kampaniya saxlanılmır.
- Bitiş saatı başlanğıc saatından əvvəl və ya ona bərabərdirsə kampaniya saxlanılmır.
- Heç bir filial seçilməyibsə kampaniya saxlanılmır.
- Heç bir həftə günü seçilməyibsə kampaniya saxlanılmır.
- Limit sahəsi boşdursa limit `limitsiz` kimi qəbul edilə bilər.
- Minimum alış məbləği boşdursa minimum məbləğ şərti tətbiq edilmir.
- Qaydanın adı boşdursa qayda əlavə edilmir.
- Qayda şərt sahəsi boşdursa sistem həmin şərti `0` kimi göstərir; real server mərhələsində bu sahələr mütləq yoxlanmalıdır.
- Hədiyyə məhsulu boşdursa, məhsul tələb etməyən nəticələr işləyə bilər: bonus balı, faiz endirimi, kupon və s.
- `Pulsuz məhsul` seçilib hədiyyə məhsulu boş saxlanılıbsa qayda server mərhələsində təsdiqlənməməlidir.

## 4. Kombinasiya nümunələri

### 3 al, 1 bonus balı

- Qayda növü: Miqdara görə
- Şərt miqdarı: 3
- Hədiyyə növü: Bonus balı
- Hədiyyə miqdarı: seçilən bal sayı

### 50 AZN alışa 5% endirim

- Qayda növü: Məbləğə görə
- Şərt məbləği: 50
- Hədiyyə növü: Faiz endirimi
- Hədiyyə dəyəri: 5

### Müəyyən məhsula pulsuz hədiyyə

- Qayda növü: Məhsula görə
- Məhsul və ya kod: əsas məhsul
- Hədiyyə növü: Pulsuz məhsul
- Hədiyyə məhsulu: hədiyyənin adı və ya kodu
- Hədiyyə miqdarı: 1

### Yalnız həftəsonu bonusu

- Kampaniya tarixlərini seçin.
- İş saatlarını seçin.
- Yalnız şənbə və bazarı işarələyin.
- Filialları seçin.
- Qaydanı əlavə edin.

## 5. Saxlama və serverə keçid

Hazırkı frontend mərhələsində kampaniya və qaydalar `localStorage` daxilində `marketErpBonusCampaign` açarı ilə saxlanılır. Server mərhələsində bu məlumatlar database-ə köçürülməlidir.

Serverdə əlavə yoxlamalar vacibdir:

- Tarix və saat aralığı
- Filial icazəsi
- Müştəri qrupu
- Kampaniya limitləri
- Eyni bonusun təkrar tətbiq olunması
- Qayda prioriteti
- Bonusların birləşdirilib-birləşdirilməməsi
- Hədiyyə məhsulunun stokda olub-olmaması
- Kassir təsdiqi və audit qeydi

Qeyd: frontend-də saxlanan məlumatlar təhlükəsiz hesab edilmir. Real parol, limit və bonus qərarları server tərəfindən hesablanmalıdır.

## 6. `Qayda əlavə et` düyməsi nə edir?

`Qayda əlavə et` düyməsinə basanda ayrıca pəncərə açılır. Bu pəncərədə bir bonusun hansı alış şərtinə görə işləyəcəyi və müştəriyə nə verəcəyi yazılır.

İş qaydası belədir:

1. Yuxarıdan qayda növünü seçin.
2. Qaydaya aydın ad verin.
3. Şərt sahələrindən yalnız uyğun olanı doldurun.
4. Hədiyyə növünü seçin.
5. Hədiyyə miqdarını və ya dəyərini yazın.
6. Lazım olduqda ilk alış, onlayn satış və kassir təsdiqini işarələyin.
7. `Qaydanı əlavə et` düyməsinə basın.
8. Qayda aşağıdakı siyahıya kart kimi düşür.

Bir qayda bir kampaniyanın içindəki bir şərtdir. Məsələn, kampaniya “Yay bonusu” ola bilər, onun içində isə “50 AZN alışa 5% endirim” və “3 ədəd alana bonus balı” kimi bir neçə qayda ola bilər.

## 7. Qayda üçün 35 kombinasiya nümunəsi

Aşağıdakı nümunələrdə göstərilən sahələri `Qayda əlavə et` pəncərəsinə köçürə bilərsiniz.

1. **50 AZN alışa 5% endirim**: Məbləğə görə → cəmi məbləğ `50` → hədiyyə `Faiz endirimi` → dəyər `5`.
2. **100 AZN alışa 10 AZN bonus balı**: Məbləğə görə → cəmi məbləğ `100` → hədiyyə `Bonus balı` → dəyər `10`.
3. **3 ədəd məhsula 1 bonus balı**: Miqdara görə → miqdar `3` → hədiyyə `Bonus balı` → miqdar `1`.
4. **5 ədəd məhsula 10% endirim**: Miqdara görə → miqdar `5` → hədiyyə `Faiz endirimi` → dəyər `10`.
5. **2 məhsul alana 1 pulsuz məhsul**: Məhsula görə → miqdar `2` → hədiyyə `Pulsuz məhsul` → hədiyyə miqdarı `1`.
6. **Süd kateqoriyasına 5% endirim**: Kateqoriyaya görə → faiz `5` → hədiyyə `Faiz endirimi` → məhsul/kateqoriya `Süd`.
7. **Şirniyyat kateqoriyasına 10 bonus balı**: Kateqoriyaya görə → hədiyyə `Bonus balı` → hədiyyə dəyəri `10`.
8. **Konkret məhsula 20% endirim**: Məhsula görə → hədiyyə `Faiz endirimi` → dəyər `20`.
9. **Konkret məhsuldan 3 ədəd alana kupon**: Məhsula görə → miqdar `3` → hədiyyə `Kassa kuponu`.
10. **50 AZN-dən yuxarı ilk alışa 15% endirim**: Məbləğə görə → məbləğ `50` → faiz `15` → yalnız ilk alış.
11. **Yeni müştəriyə 20 bonus balı**: Məbləğə görə → hədiyyə `Bonus balı` → dəyər `20` → müştəri qrupu əsas məlumatlarda `Yeni müştərilər`.
12. **Bonus kart sahibinə 2 qat bal**: Məbləğə görə → bonus balı → kart tələb olunsun.
13. **100 AZN alışa pulsuz çatdırılma**: Məbləğə görə → məbləğ `100` → `Pulsuz çatdırılma`.
14. **3 eyni məhsula hədiyyə kartı**: Miqdara görə → miqdar `3` → `Hədiyyə kartı`.
15. **10 AZN məhsul qiymətinə 5% endirim**: Qiymət şərti → qiymət `10` → `Faiz endirimi` → dəyər `5`.
16. **Məhsul qiyməti 20 AZN-dən yuxarıdırsa bonus balı**: Qiymət şərti → qiymət `20` → `Bonus balı`.
17. **5 ədəd alana 2 hədiyyə**: Miqdara görə → miqdar `5` → `Pulsuz məhsul` → hədiyyə miqdarı `2`.
18. **200 AZN alışa 20 AZN kupon**: Məbləğə görə → məbləğ `200` → `Kassa kuponu` → dəyər `20`.
19. **Həftəsonu 10% endirim**: Qayda `Faiz endirimi` → dəyər `10`; həftə günlərində yalnız şənbə və bazarı seçin.
20. **09:00–12:00 səhər bonusu**: Qayda adi şəkildə yaradılır; kampaniyanın saatlarını `09:00` və `12:00` yazın.
21. **18:00–21:00 axşam endirimi**: Kampaniya saatlarını `18:00` və `21:00` seçin; qayda nəticəsi `Faiz endirimi` olsun.
22. **Yalnız bir filialda bonus**: Əsas məlumatlarda yalnız həmin filialı işarələyin; qayda məhsul və ya məbləğə görə ola bilər.
23. **Bütün filiallarda bonus**: Əsas məlumatlarda bütün filialları işarələyin.
24. **Onlayn satışa 15% endirim**: Qayda nəticəsi faiz endirimi `15`; `Yalnız onlayn satışda` işarələnsin.
25. **Kassir təsdiqli hədiyyə**: Hədiyyə növünü seçin və `Kassir təsdiqi tələb etsin` işarələyin.
26. **İlk alışda pulsuz məhsul**: Hədiyyə növü `Pulsuz məhsul`; `Yalnız ilk alışda` işarələnsin.
27. **50 AZN alışa həm bal, həm kupon**: İki ayrı qayda yaradın; birində bonus balı, digərində kassa kuponu seçin.
28. **3 məhsula bal, 5 məhsula endirim**: İki miqdar qaydası yaradın; prioritetləri `1` və `2` verin.
29. **Kateqoriyada məhsul + faiz**: Kateqoriyaya görə qayda yaradın və həm məhsul şərtini, həm faiz nəticəsini ayrıca izah qeydinə yazın.
30. **100 AZN limiti keçəndə pulsuz çatdırılma**: Məbləğ `100`, hədiyyə `Pulsuz çatdırılma`.
31. **Bonus balı 30 gün istifadə olunsun**: Hədiyyə bonus balı seçin və müddəti kampaniya qeydlərində `30 gün` kimi yazın.
32. **Kupon yalnız kassada istifadə olunsun**: Hədiyyə `Kassa kuponu`, kassir təsdiqini aktiv edin.
33. **Məhsul koduna görə bonus**: Məhsula görə seçin və məhsul kodunu hədiyyə məhsulu/qeyd sahəsində yazın.
34. **Limitli kampaniya**: Əsas məlumatlarda müştəri başına limit və ümumi kampaniya limitini doldurun.
35. **Bonuslar üst-üstə düşməsin**: `Digər bonuslarla birlikdə tətbiq olunsun` işarəsini boş saxlayın və prioritet verin.

## 8. `Məlumatları aç` bölməsi necə doldurulur?

Bu bölmə kampaniyanın ümumi çərçivəsidir. Burada qaydanın özünü deyil, qaydanın harada və nə vaxt işləyəcəyini yazırsınız.

### 50 doldurma nümunəsi

1. Kampaniya adı: `Yay bonusu`; status: `Aktiv`.
2. Kampaniya adı: `Qış endirimi`; status: `Qaralama`.
3. Kampaniya adı: `Ramazan kampaniyası`; status: `Aktiv`.
4. Kampaniya adı: `Yeni müştəri bonusu`; status: `Aktiv`.
5. Başlanğıc `2026-06-01`, bitiş `2026-06-30`: bir aylıq kampaniya.
6. Başlanğıc `2026-12-20`, bitiş `2027-01-05`: bayram kampaniyası.
7. Başlanğıc `2026-08-20`, bitiş `2026-08-20`: yalnız bir günlük kampaniya.
8. Başlanğıc saatı `09:00`, bitiş saatı `18:00`: iş saatları kampaniyası.
9. Başlanğıc saatı `18:00`, bitiş saatı `23:00`: axşam kampaniyası.
10. Başlanğıc saatı `00:00`, bitiş saatı `23:59`: bütün gün kampaniyası.
11. Yalnız `Market Mərkəz Filialı`: filial kampaniyası.
12. Yalnız `Nizami Filialı`: həmin filial üçün xüsusi kampaniya.
13. Yalnız `28 May Filialı`: həmin filial üçün xüsusi kampaniya.
14. Bütün filiallar: bütün iş yerlərini işarələyin.
15. Yalnız bazar ertəsi: həftəlik bir gün kampaniyası.
16. Yalnız cümə: həftəsonuna hazırlıq kampaniyası.
17. Yalnız şənbə və bazar: həftəsonu kampaniyası.
18. Bazar ertəsi–cümə: iş günləri kampaniyası.
19. Bütün günlər: davamlı həftəlik kampaniya.
20. Müştəri qrupu `Bütün müştərilər`: hər kəs istifadə edə bilər.
21. Müştəri qrupu `Bonus kart sahibləri`: kartı olmayan istifadə edə bilməz.
22. Müştəri qrupu `Yeni müştərilər`: ilk alışa yönəlik kampaniya.
23. Müştəri qrupu `Seçilmiş müştəri qrupu`: serverdə ayrıca qrup bağlantısı tələb edir.
24. Minimum alış `20`: 20 AZN-dən aşağı səbət bonus almır.
25. Minimum alış `50`: daha yüksək səbət şərti.
26. Minimum alış boş: minimum məbləğ şərti yoxdur.
27. Müştəri başına limit `1`: hər müştəri yalnız bir dəfə istifadə edir.
28. Müştəri başına limit `3`: hər müştəri üç dəfə istifadə edə bilər.
29. Müştəri başına limit boş: limit serverdə limitsiz kimi idarə edilə bilər.
30. Ümumi limit `1000`: kampaniya maksimum 1000 istifadə üçün planlanır.
31. Ümumi limit boş: kampaniya ümumi limit olmadan saxlanır.
32. Digər bonuslarla birlikdə tətbiq aktiv: uyğun qaydalar birləşdirilə bilər.
33. Digər bonuslarla birlikdə tətbiq passiv: bir qayda seçilməlidir.
34. Bonus kart tələb olunur: kassir kartı yoxlamalıdır.
35. Bonus kart tələb olunmur: bütün uyğun müştərilər istifadə edə bilər.
36. Qeyd: `Yalnız kassada istifadə olunur`.
37. Qeyd: `İşçilər üçün tətbiq edilmir`.
38. Qeyd: `Endirimli məhsullara tətbiq edilmir`.
39. Qeyd: `Digər kampaniyalarla birləşdirilmir`.
40. Qeyd: `Hədiyyə stokda yoxdursa bonus verilmir`.
41. Ad + tarix + filial: konkret tarixdə konkret filial kampaniyası.
42. Ad + saat + həftəsonu: hər həftəsonu axşam kampaniyası.
43. Ad + yeni müştəri + minimum 20 AZN: ilk alış aktivləşdirməsi.
44. Ad + bonus kart + limit 1: kart sahibləri üçün birdəfəlik bonus.
45. Ad + bütün filiallar + bütün günlər: ümumi mağaza kampaniyası.
46. Ad + bir filial + bir gün: lokal test kampaniyası.
47. Qaralama statusu + bütün məlumatlar: hazırlıqda saxlanılan kampaniya.
48. Dayandırılıb statusu + qaydalar: qaydalar qalır, kampaniya tətbiq edilmir.
49. Aktiv status + tarix gələcəkdədir: tarix çatana qədər tətbiq gözləyir.
50. Aktiv status + tarix bitib: server düzgün qurulanda kampaniya artıq tətbiq edilməməlidir.

## 9. Hansı hissə nə vaxt işləyir?

Məsələn:

- Əsas məlumatlarda filial seçilməyibsə, qayda nə qədər düzgün olsa da kampaniya saxlanmamalıdır.
- Əsas məlumatlarda tarix və saat seçilib, amma qayda əlavə edilməyibsə kampaniyanın çərçivəsi var, lakin veriləcək bonus yoxdur.
- Qayda əlavə edilib, amma kampaniya statusu `Qaralama`dırsa serverdə bonus kassada tətbiq olunmamalıdır.
- Kampaniya `Aktiv`dir, lakin bu gün seçilmiş tarix aralığında deyilsə bonus verilməməlidir.
- Saat aralığından kənarda satış edilirsə bonus verilməməlidir.
- Filial seçilməyən yerdə satış edilirsə bonus verilməməlidir.
- Bir neçə qayda uyğun gəlirsə prioritet və “digər bonuslarla birlikdə” seçimi nəzərə alınmalıdır.
- Hədiyyə məhsulu stokda yoxdursa server ya alternativ nəticə seçməli, ya da bonusu tətbiq etməməlidir.
