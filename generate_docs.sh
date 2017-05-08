rm -r documentation/
jsdoc -c ./conf.json -d ./documentation -p ./package.json -t /usr/local/lib/node_modules/ink-docstrap/template/ -R README.md -r ./app
find ./documentation -type f -exec sed -i -e 's/\Global\b/Routes/g' {} \;
find ./documentation -type f -exec sed -i -e 's/\global\b/routes/g' {} \;
find ./documentation -type f -exec sed -i -e 's/\Mixins\b/Models/g' {} \;
find ./documentation -type f -exec sed -i -e 's/\Mixin\b/Model/g' {} \;
find ./documentation -type f -exec sed -i -e 's/\mixins\b/models/g' {} \;
find ./documentation -type f -exec sed -i -e 's/\mixin\b/model/g' {} \;
find ./documentation -type f -exec sed -i -e 's/\Modules\b/Controllers/g' {} \;
find ./documentation -type f -exec sed -i -e 's/\Module\b/Controller/g' {} \;
find ./documentation -type f -exec sed -i -e 's/\modules\b/controllers/g' {} \;
find ./documentation -type f -exec sed -i -e 's/\module\b/controller/g' {} \;
rename 's/global/routes/' ./documentation/kallimachos/*/*
rename 's/mixins/models/' ./documentation/kallimachos/*/*
rename 's/modules/controllers/' ./documentation/kallimachos/*/*
rename 's/module/controller/' ./documentation/kallimachos/*/*
